import type { GridItem, BTSItem, POIItem, KPIData, UserProfile, DatasetFolder, POIUpdateRecord, GeoHierarchy, SpeedTestResult } from '../types';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('grid_promoter_user') : null;
    if (raw) {
      const u = JSON.parse(raw);
      if (u.role) headers['x-user-role'] = u.role;
      if (u.scope) headers['x-user-scope'] = encodeURIComponent(u.scope);
      if (u.email) headers['x-user-email'] = u.email;
    }
  } catch {}
  return headers;
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const customHeaders: HeadersInit = {
    ...getAuthHeaders(),
    ...(options.headers || {})
  };
  return fetch(url, {
    ...options,
    headers: customHeaders
  });
}

export const api = {
  async login(username: string, password?: string): Promise<{ success: boolean; user: UserProfile }> {
    const res = await authFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Akses ditolak: Akun tidak terdaftar di Manajemen Pengguna.');
    }
    return res.json();
  },

  async verifySession(): Promise<{ valid: boolean; user?: UserProfile; error?: string }> {
    try {
      const res = await authFetch('/api/auth/verify');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { valid: false, error: data.error || 'Sesi tidak valid' };
      }
      return await res.json();
    } catch {
      return { valid: false, error: 'Koneksi ke server terputus' };
    }
  },

  async getGeoHierarchy(): Promise<{ hierarchy: GeoHierarchy }> {
    const res = await authFetch('/api/geo/hierarchy');
    if (!res.ok) throw new Error('Gagal mengambil hirarki wilayah');
    return res.json();
  },

  async getGrids(filters?: {
    region?: string;
    province?: string;
    city?: string;
    kecamatan?: string;
    category?: string;
    search?: string;
  }): Promise<GridItem[]> {
    const params = new URLSearchParams();
    if (filters?.region && filters.region !== 'ALL') params.append('region', filters.region);
    if (filters?.province && filters.province !== 'ALL') params.append('province', filters.province);
    if (filters?.city && filters.city !== 'ALL') params.append('city', filters.city);
    if (filters?.kecamatan && filters.kecamatan !== 'ALL') params.append('kecamatan', filters.kecamatan);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);

    const res = await authFetch(`/api/grids?${params.toString()}`);
    if (!res.ok) throw new Error('Gagal mengambil data grid');
    return res.json();
  },

  async getGridById(id: string): Promise<GridItem> {
    const res = await authFetch(`/api/grids/${id}`);
    if (!res.ok) throw new Error('Grid tidak ditemukan');
    return res.json();
  },

  async createGrid(grid: GridItem): Promise<GridItem> {
    const res = await authFetch('/api/grids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(grid)
    });
    if (!res.ok) throw new Error('Gagal menyimpan grid baru');
    return res.json();
  },

  async updateGrid(id: string, updates: Partial<GridItem>): Promise<GridItem> {
    const res = await authFetch(`/api/grids/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Gagal memperbarui grid');
    return res.json();
  },

  async deleteGrid(id: string): Promise<boolean> {
    const res = await authFetch(`/api/grids/${id}`, {
      method: 'DELETE'
    });
    return res.ok;
  },

  async getBTS(filters?: {
    region?: string;
    province?: string;
    city?: string;
    kec?: string;
    rev?: string;
    search?: string;
  }): Promise<BTSItem[]> {
    const params = new URLSearchParams();
    if (filters?.region && filters.region !== 'ALL') params.append('region', filters.region);
    if (filters?.province && filters.province !== 'ALL') params.append('province', filters.province);
    if (filters?.city && filters.city !== 'ALL') params.append('city', filters.city);
    if (filters?.kec && filters.kec !== 'ALL') params.append('kec', filters.kec);
    if (filters?.rev && filters.rev !== 'ALL') params.append('rev', filters.rev);
    if (filters?.search) params.append('search', filters.search);

    const res = await authFetch(`/api/bts?${params.toString()}`);
    if (!res.ok) throw new Error('Gagal mengambil data BTS');
    return res.json();
  },

  async createBTS(bts: BTSItem): Promise<BTSItem> {
    const res = await authFetch('/api/bts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bts)
    });
    if (!res.ok) throw new Error('Gagal menambah data BTS');
    return res.json();
  },

  async updateBTS(id: string, updates: Partial<BTSItem>): Promise<BTSItem> {
    const res = await authFetch(`/api/bts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Gagal update BTS');
    return res.json();
  },

  async deleteBTS(id: string): Promise<boolean> {
    const res = await authFetch(`/api/bts/${id}`, { method: 'DELETE' });
    return res.ok;
  },

  async getPOIs(filters?: { region?: string; province?: string; city?: string; kec?: string } | string): Promise<POIItem[]> {
    const params = new URLSearchParams();
    if (typeof filters === 'string') {
      if (filters && filters !== 'ALL') params.append('city', filters);
    } else if (filters) {
      if (filters.region && filters.region !== 'ALL') params.append('region', filters.region);
      if (filters.province && filters.province !== 'ALL') params.append('province', filters.province);
      if (filters.city && filters.city !== 'ALL') params.append('city', filters.city);
      if (filters.kec && filters.kec !== 'ALL') params.append('kec', filters.kec);
    }
    const res = await authFetch(`/api/pois?${params.toString()}`);
    if (!res.ok) throw new Error('Gagal mengambil data POI');
    return res.json();
  },

  async createPOI(poi: POIItem): Promise<POIItem> {
    const res = await authFetch('/api/pois', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(poi)
    });
    if (!res.ok) throw new Error('Gagal menambah POI');
    return res.json();
  },

  async updatePOI(id: string, updates: Partial<POIItem>): Promise<POIItem> {
    const res = await authFetch(`/api/pois/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Gagal memperbarui POI');
    return res.json();
  },

  async deletePOI(id: string): Promise<boolean> {
    const res = await authFetch(`/api/pois/${id}`, { method: 'DELETE' });
    return res.ok;
  },

  // User Management
  async getUsers(): Promise<UserProfile[]> {
    const res = await authFetch('/api/users');
    if (!res.ok) throw new Error('Gagal mengambil daftar pengguna');
    return res.json();
  },

  async createUser(payload: {
    name: string;
    email: string;
    role: string;
    scope: string;
    password?: string;
    status?: string;
  }): Promise<UserProfile> {
    const res = await authFetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal membuat pengguna baru');
    }
    return res.json();
  },

  async updateUser(id: string, updates: Partial<UserProfile & { password?: string }>): Promise<UserProfile> {
    const res = await authFetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Gagal memperbarui data pengguna');
    return res.json();
  },

  async deleteUser(id: string): Promise<boolean> {
    const res = await authFetch(`/api/users/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal menghapus pengguna');
    }
    return res.ok;
  },

  async getKPI(filters?: { region?: string; province?: string; city?: string; kecamatan?: string }): Promise<KPIData> {
    const params = new URLSearchParams();
    if (filters?.region && filters.region !== 'ALL') params.append('region', filters.region);
    if (filters?.province && filters.province !== 'ALL') params.append('province', filters.province);
    if (filters?.city && filters.city !== 'ALL') params.append('city', filters.city);
    if (filters?.kecamatan && filters.kecamatan !== 'ALL') params.append('kecamatan', filters.kecamatan);

    const res = await authFetch(`/api/kpi?${params.toString()}`);
    if (!res.ok) throw new Error('Gagal menghitung KPI');
    return res.json();
  },

  async cmsUpload(
    type: 'bts' | 'grid' | 'poi',
    records: unknown[],
    options?: { folderId?: string; fileName?: string; mode?: 'replace' | 'merge'; activate?: boolean }
  ): Promise<{ success: boolean; count: number; message: string; folder?: DatasetFolder }> {
    const res = await authFetch('/api/cms/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, records, ...options })
    });
    if (!res.ok) throw new Error('Gagal mengunggah dataset master');
    return res.json();
  },

  async getFolders(): Promise<DatasetFolder[]> {
    const res = await authFetch('/api/folders');
    if (!res.ok) throw new Error('Gagal mengambil daftar folder');
    return res.json();
  },

  async createFolder(payload: {
    name: string;
    description?: string;
    region?: string;
    city?: string;
    dataDate?: string;
    period?: string;
  }): Promise<DatasetFolder> {
    const res = await authFetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Gagal membuat folder dataset baru');
    return res.json();
  },

  async getFolderById(id: string): Promise<{ folder: DatasetFolder; grids: GridItem[]; bts: BTSItem[]; pois: POIItem[] }> {
    const res = await authFetch(`/api/folders/${id}`);
    if (!res.ok) throw new Error('Gagal mengambil rincian folder');
    return res.json();
  },

  async updateFolder(id: string, updates: Partial<DatasetFolder>): Promise<DatasetFolder> {
    const res = await authFetch(`/api/folders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Gagal memperbarui info folder');
    return res.json();
  },

  async deleteFolder(id: string): Promise<boolean> {
    const res = await authFetch(`/api/folders/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Gagal menghapus folder dataset');
    return res.ok;
  },

  async activateFolder(id: string): Promise<{ success: boolean; message: string; folder?: DatasetFolder }> {
    const res = await authFetch(`/api/folders/${id}/activate`, { method: 'POST' });
    if (!res.ok) throw new Error('Gagal mengaktifkan folder dataset');
    return res.json();
  },

  async uploadToFolder(
    folderId: string,
    payload: {
      type: 'grid' | 'bts' | 'poi' | 'batch';
      records: unknown[];
      fileName?: string;
      mode?: 'replace' | 'merge';
      activate?: boolean;
    },
    onProgress?: (uploaded: number, total: number, percent: number) => void
  ): Promise<{ success: boolean; count: number; message: string; folder: DatasetFolder }> {
    const totalRecords = payload.records.length;
    const CHUNK_SIZE = 4000;

    if (totalRecords <= CHUNK_SIZE) {
      const res = await authFetch(`/api/folders/${folderId}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, isFirstChunk: true, isLastChunk: true, totalRecords })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Gagal mengunggah data (${res.status} ${res.statusText})`);
      }
      if (onProgress) onProgress(totalRecords, totalRecords, 100);
      return res.json();
    }

    // Chunked upload for large datasets (> 4,000 records) to prevent network/proxy timeout or payload size limits
    let lastResult: any = null;
    const totalChunks = Math.ceil(totalRecords / CHUNK_SIZE);

    for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
      const start = chunkIdx * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalRecords);
      const chunkRecords = payload.records.slice(start, end);
      const isFirst = chunkIdx === 0;
      const isLast = chunkIdx === totalChunks - 1;

      const chunkPayload = {
        type: payload.type,
        records: chunkRecords,
        fileName: payload.fileName,
        mode: isFirst ? (payload.mode || 'merge') : 'append',
        activate: isLast ? (payload.activate ?? true) : false,
        isFirstChunk: isFirst,
        isLastChunk: isLast,
        totalRecords
      };

      const res = await authFetch(`/api/folders/${folderId}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunkPayload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Gagal mengunggah data bagian ke-${chunkIdx + 1} dari ${totalChunks} (${res.status} ${res.statusText})`);
      }

      lastResult = await res.json();
      if (onProgress) {
        const percent = Math.round((end / totalRecords) * 100);
        onProgress(end, totalRecords, percent);
      }
    }

    return {
      success: true,
      count: totalRecords,
      message: `Berhasil mengunggah dan mengupdate ${totalRecords} data ke folder '${lastResult?.folder?.name || 'Dataset'}'`,
      folder: lastResult?.folder
    };
  },

  async exportFolder(id: string): Promise<any> {
    const res = await authFetch(`/api/folders/${id}/export`);
    if (!res.ok) throw new Error('Gagal mengekspor data folder');
    return res.json();
  },

  async resetDatabase(): Promise<boolean> {
    const res = await authFetch('/api/reset-db', { method: 'POST' });
    return res.ok;
  },

  // --- FORM POI / Survey & Update POI Log API ---
  async getPOILogs(): Promise<POIUpdateRecord[]> {
    const res = await authFetch('/api/form-poi/logs');
    if (!res.ok) throw new Error('Gagal mengambil riwayat POI logs');
    return res.json();
  },

  async createPOILog(payload: {
    promoterId?: string;
    promoterName?: string;
    promoterEmail?: string;
    location: { lat: number; lng: number; accuracy?: number; address?: string };
    photos: string[];
    notes: string;
    poiName?: string;
    poiCategory?: string;
    gridId?: string;
    customerData?: { customerName?: string; phone?: string; msisdn?: string; serviceType?: string };
    addToPoiCatalog?: boolean;
  }): Promise<{ success: boolean; log: POIUpdateRecord }> {
    const res = await authFetch('/api/form-poi/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal menyimpan data FORM POI');
    }
    return res.json();
  },

  async deletePOILog(id: string): Promise<boolean> {
    const res = await authFetch(`/api/form-poi/logs/${id}`, { method: 'DELETE' });
    return res.ok;
  },

  // --- Network Speed Test API ---
  async runPing(): Promise<number> {
    const start = performance.now();
    const res = await authFetch(`/api/speedtest/ping?_t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Ping failed');
    return Math.round(performance.now() - start);
  },

  async getSpeedTestLogs(): Promise<SpeedTestResult[]> {
    const res = await authFetch('/api/speedtest/logs');
    if (!res.ok) throw new Error('Gagal mengambil data riwayat tes jaringan');
    return res.json();
  },

  async createSpeedTestLog(payload: Partial<SpeedTestResult>): Promise<{ success: boolean; log: SpeedTestResult }> {
    const res = await authFetch('/api/speedtest/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Gagal menyimpan hasil tes jaringan');
    return res.json();
  },

  async deleteSpeedTestLog(id: string): Promise<boolean> {
    const res = await authFetch(`/api/speedtest/logs/${id}`, { method: 'DELETE' });
    return res.ok;
  }
};
