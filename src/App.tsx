import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { UserProfile, FilterState, GridItem, BTSItem, POIItem, KPIData, AppModule, DatasetFolder, GeoHierarchy } from './types';
import { api } from './services/api';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { KPICards } from './components/KPICards';
import { MapView } from './components/MapView';
import { GridTable } from './components/GridTable';
import { LoginPage } from './components/LoginPage';
import { CMSModal } from './components/CMSModal';
import { GridEditModal } from './components/GridEditModal';
import { BTSEditModal } from './components/BTSEditModal';
import { DeployGuideModal } from './components/DeployGuideModal';
import { CMSPage } from './components/CMSPage';
import { FormPOIModule } from './components/FormPOIModule';
import { NetworkCheckModule } from './components/NetworkCheckModule';

export default function App() {
  // User Authentication State
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('grid_promoter_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Current view: GIS Map vs Dedicated CMS Page
  const [currentView, setCurrentView] = useState<'map' | 'cms'>('map');

  // Active module in the sidebar: 'grid' | 'form_poi' | 'network_check'
  const [activeModule, setActiveModule] = useState<AppModule>('grid');

  // Dark Mode Theme State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('grid_promoter_theme');
    return saved !== null ? saved === 'dark' : true;
  });

  // Strictly verify that current session user is still registered and active in database
  useEffect(() => {
    if (user) {
      api.verifySession().then((res) => {
        if (!res.valid) {
          console.warn('Akses ditolak / Sesi tidak terdaftar:', res.error);
          localStorage.removeItem('grid_promoter_user');
          setUser(null);
        } else if (res.user) {
          setUser(res.user);
          localStorage.setItem('grid_promoter_user', JSON.stringify(res.user));
        }
      }).catch(() => {
        // ignore network glitches
      });
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleToggleDarkMode = (val: boolean) => {
    setIsDarkMode(val);
    localStorage.setItem('grid_promoter_theme', val ? 'dark' : 'light');
  };

  // Filter State matching user's screenshot default: East Java -> Jawa Timur (4672) -> Kab. Bangkalan
  const [filters, setFilters] = useState<FilterState>({
    region: 'EAST JAVA',
    province: 'JAWA TIMUR (4672)',
    city: 'KAB. BANGKALAN',
    kecamatan: 'ALL',
    searchMode: 'grid',
    searchQuery: '',
    categories: {
      '1st Priority Acquisition': true,
      '2nd Priority Acquisition': true,
      '3rd Priority': true,
      'Avoid Cannibalism': true
    }
  });

  // Database Data States
  const [grids, setGrids] = useState<GridItem[]>([]);
  const [btsList, setBtsList] = useState<BTSItem[]>([]);
  const [pois, setPois] = useState<POIItem[]>([]);
  const [geoHierarchy, setGeoHierarchy] = useState<GeoHierarchy>({});
  const [kpi, setKpi] = useState<KPIData>({
    towerCount: 0,
    gridCount: 0,
    poiCount: 0,
    p1Count: 0,
    p2Count: 0,
    p3Count: 0,
    cannibalCount: 0
  });

  const [loading, setLoading] = useState(false);
  const [focusedLocation, setFocusedLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Modals
  const [isCMSOpen, setIsCMSOpen] = useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [activeFolderName, setActiveFolderName] = useState<string>('');
  const [editingGrid, setEditingGrid] = useState<GridItem | null>(null);
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);
  const [editingBTS, setEditingBTS] = useState<BTSItem | null>(null);
  const [isDbResetting, setIsDbResetting] = useState(false);

  const activeReqId = useRef(0);

  // Fetch static metadata (GeoHierarchy & Folders) only once or when datasets change
  const fetchMetadata = useCallback(async () => {
    try {
      const [loadedFolders, geoRes] = await Promise.all([
        api.getFolders().catch(() => [] as DatasetFolder[]),
        api.getGeoHierarchy().catch(() => ({ hierarchy: {} }))
      ]);
      if (geoRes?.hierarchy) {
        setGeoHierarchy(geoRes.hierarchy);
      }
      if (loadedFolders.length > 0) {
        const currentActive = loadedFolders.find((f) => f.isActive) || loadedFolders[0];
        setActiveFolderName(currentActive?.name || '');
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
    }
  }, []);

  // Fetch filtered data (Grids, BTS, POIs) with race condition cancellation & instantaneous local KPI
  const fetchData = useCallback(async () => {
    const reqId = ++activeReqId.current;
    setLoading(true);
    try {
      // Build category string filter
      const activeCats = Object.entries(filters.categories)
        .filter(([_, active]) => active)
        .map(([cat]) => cat);
      const categoryParam = activeCats.length === 4 ? undefined : activeCats.join(',');

      const [loadedGrids, loadedBTS, loadedPois] = await Promise.all([
        api.getGrids({
          region: filters.region,
          province: filters.province,
          city: filters.city,
          kecamatan: filters.kecamatan,
          category: categoryParam,
          search: filters.searchMode === 'grid' ? filters.searchQuery : undefined
        }),
        api.getBTS({
          region: filters.region,
          province: filters.province,
          city: filters.city,
          kec: filters.kecamatan,
          search: filters.searchMode === 'bts' ? filters.searchQuery : undefined
        }),
        api.getPOIs({
          region: filters.region,
          province: filters.province,
          city: filters.city,
          kec: filters.kecamatan
        })
      ]);

      // If another request was dispatched while this was in-flight, discard stale result
      if (reqId !== activeReqId.current) return;

      setGrids(loadedGrids);
      setBtsList(loadedBTS);
      setPois(loadedPois);

      // Instantaneous local KPI calculation (0ms latency, 100% accurate)
      let p1 = 0, p2 = 0, p3 = 0, can = 0;
      for (let i = 0; i < loadedGrids.length; i++) {
        const cat = loadedGrids[i]['SF Grid Category'] || loadedGrids[i].SF_Grid_Category || loadedGrids[i].cat;
        if (cat === '1st Priority Acquisition') p1++;
        else if (cat === '2nd Priority Acquisition') p2++;
        else if (cat === '3rd Priority') p3++;
        else if (cat === 'Avoid Cannibalism') can++;
      }

      setKpi({
        towerCount: loadedBTS.length,
        gridCount: loadedGrids.length,
        poiCount: loadedPois.length,
        p1Count: p1,
        p2Count: p2,
        p3Count: p3,
        cannibalCount: can
      });
    } catch (err) {
      if (reqId === activeReqId.current) {
        console.error('Error fetching database records:', err);
      }
    } finally {
      if (reqId === activeReqId.current) {
        setLoading(false);
      }
    }
  }, [filters]);

  useEffect(() => {
    if (user) {
      fetchMetadata();
      fetchData();
    }
  }, [user, fetchData, fetchMetadata]);

  // Handle Login & Logout
  const handleLoginSuccess = (loggedInUser: UserProfile) => {
    setUser(loggedInUser);
    localStorage.setItem('grid_promoter_user', JSON.stringify(loggedInUser));

    // Customize scope default
    if (loggedInUser.role === 'REGION') {
      setFilters((prev) => ({
        ...prev,
        region: 'BALI NUSRA',
        province: 'BALI (602)',
        city: 'ALL',
        kecamatan: 'ALL'
      }));
    } else if (loggedInUser.role === 'CITY') {
      setFilters((prev) => ({
        ...prev,
        region: 'EAST JAVA',
        province: 'JAWA TIMUR (4672)',
        city: 'KAB. BANGKALAN',
        kecamatan: 'ALL'
      }));
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('grid_promoter_user');
  };

  // Available Kecamatans derived from Grids in memory or known list
  const availableKecamatans = useMemo(() => {
    const set = new Set<string>();
    grids.forEach((g) => {
      if (g.kecamatan) set.add(g.kecamatan);
    });
    return Array.from(set).sort();
  }, [grids]);

  // Reset Filters
  const handleResetFilters = () => {
    setFilters({
      region: 'EAST JAVA',
      province: 'JAWA TIMUR (4672)',
      city: 'KAB. BANGKALAN',
      kecamatan: 'ALL',
      searchMode: 'grid',
      searchQuery: '',
      categories: {
        '1st Priority Acquisition': true,
        '2nd Priority Acquisition': true,
        '3rd Priority': true,
        'Avoid Cannibalism': true
      }
    });
  };

  // CRUD Handlers
  const handleSaveGrid = async (gridToSave: GridItem) => {
    if (user?.role !== 'ADMIN') {
      alert('Akses ditolak: Hanya Super Admin yang berhak menambah atau mengubah data.');
      return;
    }
    if (editingGrid) {
      await api.updateGrid(gridToSave.id, gridToSave);
    } else {
      await api.createGrid(gridToSave);
    }
    fetchData();
  };

  const handleDeleteGrid = async (gridId: string) => {
    if (user?.role !== 'ADMIN') {
      alert('Akses ditolak: Hanya Super Admin yang berhak menghapus data.');
      return;
    }
    await api.deleteGrid(gridId);
    fetchData();
  };

  const handleSaveBTS = async (btsToSave: BTSItem) => {
    if (user?.role !== 'ADMIN') {
      alert('Akses ditolak: Hanya Super Admin yang berhak mengubah data BTS.');
      return;
    }
    if (editingBTS) {
      await api.updateBTS(btsToSave.id, btsToSave);
    } else {
      await api.createBTS(btsToSave);
    }
    fetchData();
  };

  const handleDeleteBTS = async (btsId: string) => {
    if (user?.role !== 'ADMIN') {
      alert('Akses ditolak: Hanya Super Admin yang berhak menghapus data BTS.');
      return;
    }
    await api.deleteBTS(btsId);
    fetchData();
  };

  const handleResetDB = async () => {
    if (!window.confirm('Reset database ke data awal standar (Bangkalan 207 grid & Bali 602 grid)?')) {
      return;
    }
    setIsDbResetting(true);
    try {
      await api.resetDatabase();
      await fetchData();
    } finally {
      setIsDbResetting(false);
    }
  };

  // Locate Grid on Map
  const handleLocateGrid = (grid: GridItem) => {
    setFocusedLocation({ lat: grid.center[0], lng: grid.center[1] });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If not logged in, render LoginPage
  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // If Super Admin or Nasional Manager selected the dedicated CMS page view
  if (currentView === 'cms' && (user.role === 'ADMIN' || user.role === 'NASIONAL_MANAGER')) {
    return (
      <div className={`${isDarkMode ? 'bg-[#060c1c] text-slate-100' : 'bg-slate-100 text-slate-900'} min-h-screen flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200`}>
        <CMSPage
          user={user}
          onBackToMap={() => {
            setCurrentView('map');
            fetchData();
            fetchMetadata();
          }}
          onDataUpdated={() => {
            fetchData();
            fetchMetadata();
          }}
          isDarkMode={isDarkMode}
        />
        <DeployGuideModal
          isOpen={isDeployModalOpen}
          onClose={() => setIsDeployModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className={`${isDarkMode ? 'bg-[#060c1c] text-slate-100' : 'bg-slate-100 text-slate-900'} min-h-screen flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200`}>
      {/* Top Header */}
      <Header
        user={user}
        currentView={currentView}
        onToggleView={(v) => setCurrentView(v)}
        onLogout={handleLogout}
        onOpenCMS={() => setCurrentView('cms')}
        onOpenNewGrid={() => {
          setEditingGrid(null);
          setIsGridModalOpen(true);
        }}
        onResetDB={handleResetDB}
        onOpenDeployGuide={() => setIsDeployModalOpen(true)}
        activeFolderName={activeFolderName}
        isDbResetting={isDbResetting}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />

      {/* Main Workspace Layout: Sidebar on Left, Content on Right */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Left Navigation & Filter Sidebar matching Image 3 */}
        <Sidebar
          user={user}
          activeModule={activeModule}
          onSelectModule={(mod) => setActiveModule(mod)}
          filters={filters}
          onFilterChange={(updates) => setFilters((prev) => ({ ...prev, ...updates }))}
          onReset={handleResetFilters}
          geoHierarchy={geoHierarchy}
          grids={grids}
          availableKecamatans={availableKecamatans}
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
        />

        {/* Dynamic Center Area based on activeModule */}
        {activeModule === 'grid' && (
          <main className={`flex-1 ${isDarkMode ? 'bg-[#060c1c]' : 'bg-slate-100'} p-4 sm:p-5 overflow-y-auto custom-scrollbar flex flex-col gap-4`}>
            {/* KPI Cards Bar */}
            <KPICards kpi={kpi} poiCount={pois.length} loading={loading} isDarkMode={isDarkMode} />

            {/* Interactive GIS Map */}
            <MapView
              grids={grids}
              btsList={btsList}
              pois={pois}
              user={user}
              onSelectGrid={(g) => console.log('Selected grid:', g.id)}
              onEditGrid={(g) => {
                setEditingGrid(g);
                setIsGridModalOpen(true);
              }}
              onEditBTS={(b) => setEditingBTS(b)}
              focusedLocation={focusedLocation}
              isDarkMode={isDarkMode}
            />

            {/* Detail Rincian Grid & BTS Data Table */}
            <GridTable
              grids={grids}
              btsList={btsList}
              user={user}
              onLocate={handleLocateGrid}
              onLocateBTS={(b) => {
                const lat = b.latitude ?? b.lat;
                const lng = b.ongitude ?? b.longitude ?? b.lng;
                if (lat && lng) {
                  setFocusedLocation({ lat, lng });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              onEdit={(g) => {
                setEditingGrid(g);
                setIsGridModalOpen(true);
              }}
              onEditBTS={(b) => {
                setEditingBTS(b);
              }}
              onDelete={handleDeleteGrid}
              onDeleteBTS={handleDeleteBTS}
              isDarkMode={isDarkMode}
            />
          </main>
        )}

        {activeModule === 'form_poi' && (
          <FormPOIModule
            user={user}
            grids={grids}
            isDarkMode={isDarkMode}
            onOpenInMap={(lat, lng) => {
              setActiveModule('grid');
              setFocusedLocation({ lat, lng });
            }}
          />
        )}

        {activeModule === 'network_check' && (
          <NetworkCheckModule user={user} isDarkMode={isDarkMode} />
        )}
      </div>

      {/* Modals */}
      <CMSModal
        isOpen={isCMSOpen}
        onClose={() => setIsCMSOpen(false)}
        onSuccess={() => fetchData()}
      />

      <DeployGuideModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
      />

      <GridEditModal
        isOpen={isGridModalOpen}
        grid={editingGrid}
        onClose={() => {
          setIsGridModalOpen(false);
          setEditingGrid(null);
        }}
        onSave={handleSaveGrid}
      />

      <BTSEditModal
        isOpen={!!editingBTS}
        bts={editingBTS}
        onClose={() => setEditingBTS(null)}
        onSave={handleSaveBTS}
        onDelete={handleDeleteBTS}
      />
    </div>
  );
}
