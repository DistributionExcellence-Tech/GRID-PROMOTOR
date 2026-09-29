import express from 'express';
import compression from 'compression';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/data-store.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ultra-fast HTTP payload compression (reduces JSON size by ~85% on the wire)
  app.use(compression({
    threshold: 1024,
    level: 6
  }));

  app.use(express.json({ limit: '150mb' }));
  app.use(express.urlencoded({ extended: true, limit: '150mb' }));

  // --- API ROUTES FIRST ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth / Login
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'User Name / Email wajib diisi' });
    }
    const authResult = db.authenticate(username, password);
    if (!authResult.success || !authResult.user) {
      return res.status(401).json({ error: authResult.error || 'Akses ditolak: Akun tidak terdaftar' });
    }
    res.json({ success: true, user: authResult.user });
  });

  // Verify Active Session
  app.get('/api/auth/verify', (req, res) => {
    const rawEmail = (req.headers['x-user-email'] as string) || '';
    if (!rawEmail) {
      return res.status(401).json({ valid: false, error: 'Tidak ada sesi login aktif' });
    }
    const user = db.findUserByEmail(rawEmail);
    if (!user) {
      return res.status(401).json({
        valid: false,
        error: 'Akses Ditolak: Akun tidak lagi terdaftar di Manajemen Pengguna Berdasarkan Role.'
      });
    }
    if (user.status === 'INACTIVE') {
      return res.status(403).json({
        valid: false,
        error: 'Akses Ditolak: Akun Anda sedang dinonaktifkan oleh Administrator.'
      });
    }
    res.json({
      valid: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        scope: user.scope,
        email: user.email,
        status: user.status || 'ACTIVE'
      }
    });
  });

  // --- ROLE-BASED ACCESS CONTROL (RBAC) & SECURITY MIDDLEWARE ---
  app.use('/api', (req, res, next) => {
    // Whitelist public routes that don't need RBAC
    if (
      req.path === '/health' ||
      req.path === '/auth/login' ||
      req.path === '/auth/verify' ||
      req.path === '/geo/hierarchy' ||
      req.path.startsWith('/speedtest')
    ) {
      return next();
    }

    const userRole = (req.headers['x-user-role'] as string) || '';
    const rawScope = (req.headers['x-user-scope'] as string) || '';
    const rawEmail = (req.headers['x-user-email'] as string) || '';
    const userScope = decodeURIComponent(rawScope).trim();

    // STRICT SECURITY: Verifikasi apakah pengakses benar-benar ada di database Manajemen Pengguna
    if (rawEmail) {
      const registeredUser = db.findUserByEmail(rawEmail);
      if (!registeredUser) {
        return res.status(401).json({
          error: 'Akses Ditolak: Akun Anda tidak terdaftar di Manajemen Pengguna Berdasarkan Role. Sesi login dibatalkan.'
        });
      }
      if (registeredUser.status === 'INACTIVE') {
        return res.status(403).json({
          error: 'Akses Ditolak: Akun Anda saat ini dinonaktifkan (Status: Inactive) oleh Administrator.'
        });
      }
    }

    // STRICT USER MANAGEMENT PERMISSION: Hanya role ADMIN yang boleh mutasi user
    if (req.path.startsWith('/users') && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
      if (userRole !== 'ADMIN') {
        return res.status(403).json({
          error: 'Akses Ditolak: Hanya Super Admin yang berwenang menambah, mengubah, atau menghapus pengguna.'
        });
      }
    }

    // 1. NASIONAL MANAGER: Full read access to all hierarchies, BUT STRICTLY READ-ONLY (No Edit)
    if (userRole === 'NASIONAL_MANAGER' && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      return res.status(403).json({
        error: 'Akses Ditolak: Role Nasional Manager hanya memiliki hak akses pantau/lihat (Read-Only) dan tidak diizinkan mengubah, menambah, atau menghapus data.'
      });
    }

    // 2. REGION SCOPE: Scope is strictly the assigned region
    if (userRole === 'REGION' && userScope && req.method === 'GET') {
      // Force region filter in query params to user's assigned scope
      req.query.region = userScope;
    }

    // 3. CITY SCOPE: Scope is strictly the assigned city
    if (userRole === 'CITY' && userScope && req.method === 'GET') {
      // Force city filter in query params to user's assigned scope
      req.query.city = userScope;
    }

    next();
  });

  // Grids API
  app.get('/api/grids', (req, res) => {
    const { region, province, city, kecamatan, category, search } = req.query as Record<string, string>;
    const grids = db.getGrids({ region, province, city, kecamatan, category, search });
    res.json(grids);
  });

  app.get('/api/grids/export/csv', (req, res) => {
    const csv = db.getGridsCSV();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="GRID_Database_Master_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  });

  app.get('/api/grids/:id', (req, res) => {
    const grid = db.getGridById(req.params.id);
    if (!grid) {
      return res.status(404).json({ error: 'Grid not found' });
    }
    res.json(grid);
  });

  app.post('/api/grids', (req, res) => {
    const newGrid = req.body;
    if (!newGrid.id || !newGrid.city || !newGrid.cat) {
      return res.status(400).json({ error: 'Missing required grid fields (id, city, cat)' });
    }
    const saved = db.addGrid(newGrid);
    res.status(201).json(saved);
  });

  app.put('/api/grids/:id', (req, res) => {
    const updated = db.updateGrid(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Grid not found' });
    }
    res.json(updated);
  });

  app.delete('/api/grids/:id', (req, res) => {
    const success = db.deleteGrid(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Grid not found or already deleted' });
    }
    res.json({ success: true, message: `Grid ${req.params.id} deleted` });
  });

  // BTS API
  app.get('/api/bts', (req, res) => {
    const { region, province, city, kec, rev, search, limit } = req.query as Record<string, string>;
    const parsedLimit = limit ? parseInt(limit) : undefined;
    const bts = db.getBTS({ region, province, city, kec, rev, search, limit: isNaN(parsedLimit!) ? undefined : parsedLimit });
    res.json(bts);
  });

  app.post('/api/bts', (req, res) => {
    const newBts = req.body;
    if (!newBts.id || !newBts.name) {
      return res.status(400).json({ error: 'Missing required BTS fields' });
    }
    const saved = db.addBTS(newBts);
    res.status(201).json(saved);
  });

  app.put('/api/bts/:id', (req, res) => {
    const updated = db.updateBTS(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'BTS not found' });
    }
    res.json(updated);
  });

  app.delete('/api/bts/:id', (req, res) => {
    const success = db.deleteBTS(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'BTS not found' });
    }
    res.json({ success: true });
  });

  // POI API
  app.get('/api/pois', (req, res) => {
    const { region, province, city, kec } = req.query as Record<string, string>;
    const pois = db.getPOIs({ region, province, city, kec });
    res.json(pois);
  });

  app.post('/api/pois', (req, res) => {
    const poi = db.addPOI(req.body);
    res.status(201).json(poi);
  });

  app.put('/api/pois/:id', (req, res) => {
    const updated = db.updatePOI(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'POI tidak ditemukan' });
    }
    res.json(updated);
  });

  app.delete('/api/pois/:id', (req, res) => {
    const success = db.deletePOI(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'POI tidak ditemukan' });
    }
    res.json({ success: true, message: 'POI berhasil dihapus' });
  });

  // Geographic Hierarchy API for synchronized cascading filters (Region > Provinsi > Kota/Kab > Kecamatan)
  app.get('/api/geo/hierarchy', (req, res) => {
    const hierarchy = db.getGeoHierarchy();
    res.json({ hierarchy });
  });

  // User Management API (Super Admin)
  app.get('/api/users', (req, res) => {
    const users = db.getUsers();
    res.json(users);
  });

  app.post('/api/users', (req, res) => {
    const { name, email, role, scope, password, status } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Nama dan email wajib diisi' });
    }
    const created = db.createUser({ name, email, role, scope, password, status });
    res.status(201).json(created);
  });

  app.put('/api/users/:id', (req, res) => {
    const updated = db.updateUser(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    res.json(updated);
  });

  app.delete('/api/users/:id', (req, res) => {
    const success = db.deleteUser(req.params.id);
    if (!success) {
      return res.status(400).json({ error: 'Tidak dapat menghapus user utama admin atau user tidak ditemukan' });
    }
    res.json({ success: true, message: 'User berhasil dihapus' });
  });

  // KPI API
  app.get('/api/kpi', (req, res) => {
    const { region, province, city, kecamatan } = req.query as Record<string, string>;
    const kpi = db.getKPI({ region, province, city, kecamatan });
    res.json(kpi);
  });

  // CMS Batch Upload
  app.post('/api/cms/upload', (req, res) => {
    const { type, records, folderId, fileName, mode, activate } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'Records must be an array' });
    }

    if (folderId) {
      const result = db.uploadToFolder(folderId, {
        type: type || 'grid',
        records,
        fileName,
        mode: mode || 'merge',
        activate: activate ?? true
      });
      return res.json({
        success: true,
        count: result.count,
        folder: result.folder,
        message: `Berhasil mengupdate ${result.count} data ke folder '${result.folder.name}'`
      });
    }

    if (type === 'bts') {
      const count = db.batchUpsertBTS(records);
      return res.json({ success: true, count, message: `Berhasil mengupdate ${count} data BTS di database` });
    } else if (type === 'grid') {
      const count = db.batchUpsertGrids(records);
      return res.json({ success: true, count, message: `Berhasil mengupdate ${count} data Grid di database` });
    }

    res.status(400).json({ error: 'Tipe dataset tidak didukung' });
  });

  // --- DATASET FOLDERS API ---
  app.get('/api/folders', (req, res) => {
    const folders = db.getFolders();
    res.json(folders);
  });

  app.post('/api/folders', (req, res) => {
    const { name, description, region, city, dataDate, period } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nama folder wajib diisi' });
    }
    const created = db.createFolder(name.trim(), description, region, city, dataDate, period);
    res.status(201).json(created);
  });

  app.get('/api/folders/:id', (req, res) => {
    const folderData = db.getFolderById(req.params.id);
    if (!folderData) {
      return res.status(404).json({ error: 'Folder tidak ditemukan' });
    }
    res.json(folderData);
  });

  app.put('/api/folders/:id', (req, res) => {
    const updated = db.updateFolder(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Folder tidak ditemukan' });
    }
    res.json(updated);
  });

  app.delete('/api/folders/:id', (req, res) => {
    const success = db.deleteFolder(req.params.id);
    if (!success) {
      return res.status(400).json({ error: 'Tidak dapat menghapus folder (minimal harus tersisa 1 folder)' });
    }
    res.json({ success: true, message: 'Folder berhasil dihapus' });
  });

  app.post('/api/folders/:id/activate', (req, res) => {
    const success = db.activateFolder(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Folder tidak ditemukan' });
    }
    const folder = db.getFolders().find(f => f.id === req.params.id);
    res.json({ success: true, message: 'Dataset folder berhasil diaktifkan ke peta GIS dan analytics', folder });
  });

  app.post('/api/folders/:id/upload', (req, res) => {
    try {
      const { type, records, fileName, mode, activate, isFirstChunk, isLastChunk, totalRecords } = req.body;
      if (!Array.isArray(records)) {
        return res.status(400).json({ error: 'Records harus berupa array data' });
      }
      const result = db.uploadToFolder(req.params.id, {
        type: type || 'grid',
        records,
        fileName,
        mode: mode || 'merge',
        activate: activate ?? true,
        isFirstChunk,
        isLastChunk,
        totalRecords
      });
      res.json({
        success: true,
        count: result.count,
        folder: result.folder,
        message: `Berhasil mengunggah dan mengupdate ${result.count} data ke folder '${result.folder.name}'`
      });
    } catch (err: any) {
      console.error('Error in /api/folders/:id/upload:', err);
      res.status(500).json({ error: err.message || 'Gagal mengunggah data ke folder' });
    }
  });

  app.get('/api/folders/:id/export', (req, res) => {
    const exported = db.exportFolderData(req.params.id);
    if (!exported) {
      return res.status(404).json({ error: 'Folder tidak ditemukan' });
    }
    res.json(exported);
  });

  // Reset to default seed
  app.post('/api/reset-db', (req, res) => {
    db.resetDefaults();
    res.json({ success: true, message: 'Database reset to default seed data' });
  });

  // --- FORM POI & SURVEY & UPDATE POI ROUTES ---
  app.get('/api/form-poi/logs', (req, res) => {
    const logs = db.getPOILogs();
    res.json(logs);
  });

  app.post('/api/form-poi/logs', (req, res) => {
    const { promoterId, promoterName, promoterEmail, location, photos, notes, poiName, poiCategory, gridId, customerData, addToPoiCatalog } = req.body;
    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      return res.status(400).json({ error: 'GPS location (lat, lng) is required' });
    }

    const savedLog = db.addPOILog({
      promoterId: promoterId || 'unknown',
      promoterName: promoterName || 'Promoter',
      promoterEmail: promoterEmail || '',
      location,
      photos: Array.isArray(photos) ? photos : [],
      notes: notes || '',
      poiName,
      poiCategory,
      gridId,
      customerData
    });

    // Optionally auto-register as an official POI in the GIS catalog if name provided or flagged
    if (addToPoiCatalog && poiName) {
      try {
        db.addPOI({
          id: `POI-${Date.now()}`,
          name: poiName,
          type: poiCategory || 'Outlet / Retail',
          city: 'Bangkalan',
          kec: 'Bangkalan',
          grid: gridId || 'GRID-1000',
          lat: location.lat,
          lng: location.lng
        });
      } catch (err) {
        console.warn('Could not auto-add POI catalog item', err);
      }
    }

    res.json({ success: true, log: savedLog });
  });

  app.delete('/api/form-poi/logs/:id', (req, res) => {
    const success = db.deletePOILog(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Log not found' });
    }
    res.json({ success: true, message: 'Log POI berhasil dihapus' });
  });

  // --- NETWORK SPEED TEST ROUTES ---
  app.get('/api/speedtest/ping', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json({ timestamp: Date.now(), ok: true });
  });

  // Streaming dynamic chunk data for download speed measurement
  app.get('/api/speedtest/download', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Content-Type', 'application/octet-stream');

    const requestedMb = Math.min(Math.max(parseFloat(req.query.size as string) || 4, 0.5), 15);
    const totalBytes = Math.floor(requestedMb * 1024 * 1024);
    const chunkSize = 64 * 1024; // 64KB chunk
    const chunk = Buffer.alloc(chunkSize, 'A');

    res.setHeader('Content-Length', totalBytes.toString());

    let bytesSent = 0;
    function send() {
      while (bytesSent < totalBytes) {
        const remaining = totalBytes - bytesSent;
        const currentChunkSize = Math.min(remaining, chunkSize);
        const data = currentChunkSize === chunkSize ? chunk : chunk.subarray(0, currentChunkSize);
        const canContinue = res.write(data);
        bytesSent += currentChunkSize;
        if (!canContinue) {
          res.once('drain', send);
          return;
        }
      }
      res.end();
    }
    send();
  });

  app.post('/api/speedtest/upload', (req, res) => {
    let bytesReceived = 0;
    const startTime = Date.now();
    req.on('data', (chunk) => {
      bytesReceived += chunk.length;
    });
    req.on('end', () => {
      const durationMs = Math.max(Date.now() - startTime, 1);
      const mbps = (bytesReceived * 8) / (durationMs / 1000) / 1000000;
      res.json({
        ok: true,
        bytesReceived,
        durationMs,
        mbps: Number(mbps.toFixed(2))
      });
    });
  });

  // Speed test log endpoints for CMS dashboard & auto-save
  app.get('/api/speedtest/logs', (req, res) => {
    const logs = db.getNetworkLogs();
    res.json(logs);
  });

  app.post('/api/speedtest/logs', (req, res) => {
    const { downloadMbps, uploadMbps, latencyMs, jitterMs, networkType, location, serviceChecks, promoterName, promoterEmail } = req.body;
    const newLog = db.addNetworkLog({
      downloadMbps: Number(downloadMbps) || 0,
      uploadMbps: Number(uploadMbps) || 0,
      latencyMs: Number(latencyMs) || 0,
      jitterMs: Number(jitterMs) || 0,
      networkType: networkType || '4G LTE',
      location,
      serviceChecks,
      promoterName: promoterName || 'Field Promoter',
      promoterEmail: promoterEmail || ''
    });
    res.json({ success: true, log: newLog });
  });

  app.delete('/api/speedtest/logs/:id', (req, res) => {
    const success = db.deleteNetworkLog(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Log not found' });
    }
    res.json({ success: true, message: 'Log uji jaringan berhasil dihapus' });
  });

  // --- VITE / STATIC SERVING ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GRID Promoter Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
