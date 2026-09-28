import React, { useState, useMemo } from 'react';
import {
  Compass,
  FileEdit,
  Activity,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  RotateCcw,
  Layers,
  Moon,
  Sun,
  Lock,
  ShieldCheck,
  Eye,
  MapPin,
  Building
} from 'lucide-react';
import type { FilterState, GridCategory, AppModule, UserProfile, GeoHierarchy, GridItem } from '../types';
import { CATEGORY_THEMES } from '../utils/categoryTheme';
import { TowerIcon } from './TelecomIcons';

interface SidebarProps {
  user: UserProfile;
  activeModule: AppModule;
  onSelectModule: (module: AppModule) => void;
  filters: FilterState;
  onFilterChange: (updates: Partial<FilterState>) => void;
  onReset: () => void;
  geoHierarchy?: GeoHierarchy;
  grids?: GridItem[];
  availableKecamatans?: string[];
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeModule,
  onSelectModule,
  filters,
  onFilterChange,
  onReset,
  geoHierarchy,
  grids = [],
  availableKecamatans = [],
  onLogout,
  isDarkMode,
  onToggleDarkMode
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(true);

  // Role flags
  const isSuperAdmin = user.role === 'ADMIN';
  const isNasionalManager = user.role === 'NASIONAL_MANAGER';
  const isRegionRole = user.role === 'REGION';
  const isCityRole = user.role === 'CITY';

  // Geographic Hierarchy derived strictly from GRID dataset
  const effectiveHierarchy = useMemo(() => {
    if (geoHierarchy && Object.keys(geoHierarchy).length > 1) {
      return geoHierarchy;
    }
    if (grids && grids.length > 0) {
      const hierarchy: GeoHierarchy = {};
      for (const g of grids) {
        const reg = (g.region || g.Region || g.REGION || '').trim();
        const prov = (g.province || g.Province || g.PROVINCE || '').trim();
        const city = (g.city || g.City || g.CITY || '').trim();
        const kec = (g.kecamatan || g.Kecamatan || g.KECAMATAN || '').trim();
        if (!reg || !city) continue;

        if (!hierarchy[reg]) hierarchy[reg] = {};
        if (!hierarchy[reg][prov]) hierarchy[reg][prov] = {};
        if (!hierarchy[reg][prov][city]) hierarchy[reg][prov][city] = [];
        if (kec && !hierarchy[reg][prov][city].includes(kec)) {
          hierarchy[reg][prov][city].push(kec);
        }
      }
      if (Object.keys(hierarchy).length > 0) {
        return hierarchy;
      }
    }
    return geoHierarchy || {};
  }, [geoHierarchy, grids]);

  // Find parent region & province if user has CITY role
  const cityParentInfo = useMemo(() => {
    if (!isCityRole || !user.scope) return null;
    const targetCity = user.scope.trim().toUpperCase();
    for (const r in effectiveHierarchy) {
      for (const p in effectiveHierarchy[r]) {
        const cities = Object.keys(effectiveHierarchy[r][p]);
        if (cities.some((c) => c.toUpperCase() === targetCity)) {
          return { region: r, province: p, city: user.scope };
        }
      }
    }
    return { region: 'EAST JAVA', province: 'JAWA TIMUR (4672)', city: user.scope };
  }, [isCityRole, user.scope, effectiveHierarchy]);

  // 1. Available Regions from GRID dataset
  const availableRegions = useMemo(() => {
    if (isRegionRole && user.scope) {
      return [user.scope];
    }
    if (isCityRole && cityParentInfo?.region) {
      return [cityParentInfo.region];
    }
    const keys = Object.keys(effectiveHierarchy);
    if (keys.length === 0) {
      return [
        'BALI NUSRA',
        'CENTRAL JAVA',
        'EAST JAVA',
        'JAKARTA BANTEN',
        'KALIMANTAN',
        'MALUKU PAPUA',
        'NORTHERN SUMATRA',
        'SOUTHERN SUMATRA',
        'SULAWESI',
        'WEST JAVA'
      ];
    }
    return keys.sort();
  }, [effectiveHierarchy, isRegionRole, isCityRole, user.scope, cityParentInfo]);

  // 2. Available Provinces (filtered strictly by scope)
  const availableProvinces = useMemo(() => {
    if (isCityRole && cityParentInfo?.province) {
      return [cityParentInfo.province];
    }
    const activeRegion = isRegionRole ? user.scope : (filters.region && filters.region !== 'ALL' ? filters.region : null);
    if (activeRegion && effectiveHierarchy[activeRegion]) {
      return Object.keys(effectiveHierarchy[activeRegion]).sort();
    }
    const set = new Set<string>();
    Object.values(effectiveHierarchy).forEach((provObj) => {
      Object.keys(provObj).forEach((p) => set.add(p));
    });
    return Array.from(set).sort();
  }, [effectiveHierarchy, isCityRole, isRegionRole, user.scope, cityParentInfo, filters.region]);

  // 3. Available Cities from GRID dataset (filtered strictly by scope)
  const availableCities = useMemo(() => {
    if (isCityRole && user.scope) {
      return [user.scope];
    }
    const set = new Set<string>();
    const activeRegion = isRegionRole ? user.scope : (filters.region && filters.region !== 'ALL' ? filters.region : null);

    if (filters.province && filters.province !== 'ALL') {
      Object.values(effectiveHierarchy).forEach((provObj) => {
        if (provObj[filters.province]) {
          Object.keys(provObj[filters.province]).forEach((c) => set.add(c));
        }
      });
    } else if (activeRegion && effectiveHierarchy[activeRegion]) {
      const provObj = effectiveHierarchy[activeRegion];
      Object.values(provObj).forEach((citiesObj) => {
        Object.keys(citiesObj).forEach((c) => set.add(c));
      });
    } else {
      Object.values(effectiveHierarchy).forEach((provObj) => {
        Object.values(provObj).forEach((citiesObj) => {
          Object.keys(citiesObj).forEach((c) => set.add(c));
        });
      });
    }

    return Array.from(set).sort();
  }, [effectiveHierarchy, isCityRole, isRegionRole, user.scope, filters.region, filters.province]);

  // 4. Available Kecamatans (filtered by selected City, Province, or Region)
  const dynamicKecamatans = useMemo(() => {
    const set = new Set<string>();
    const targetCity = isCityRole ? user.scope : (filters.city && filters.city !== 'ALL' ? filters.city : null);
    const activeRegion = isRegionRole ? user.scope : (filters.region && filters.region !== 'ALL' ? filters.region : null);

    if (targetCity) {
      Object.values(effectiveHierarchy).forEach((provObj) => {
        Object.values(provObj).forEach((citiesObj) => {
          if (citiesObj[targetCity]) {
            citiesObj[targetCity].forEach((k) => set.add(k));
          }
        });
      });
    } else if (filters.province && filters.province !== 'ALL') {
      Object.values(effectiveHierarchy).forEach((provObj) => {
        if (provObj[filters.province]) {
          Object.values(provObj[filters.province]).forEach((kList) => {
            kList.forEach((k) => set.add(k));
          });
        }
      });
    } else if (activeRegion && effectiveHierarchy[activeRegion]) {
      const provObj = effectiveHierarchy[activeRegion];
      Object.values(provObj).forEach((citiesObj) => {
        Object.values(citiesObj).forEach((kList) => {
          kList.forEach((k) => set.add(k));
        });
      });
    } else {
      Object.values(effectiveHierarchy).forEach((provObj) => {
        Object.values(provObj).forEach((citiesObj) => {
          Object.values(citiesObj).forEach((kList) => {
            kList.forEach((k) => set.add(k));
          });
        });
      });
    }

    const res = Array.from(set).sort();
    return res.length > 0 ? res : availableKecamatans;
  }, [effectiveHierarchy, filters.region, filters.province, filters.city, availableKecamatans]);

  const handleCategoryToggle = (cat: GridCategory) => {
    onFilterChange({
      categories: {
        ...filters.categories,
        [cat]: !filters.categories[cat]
      }
    });
  };

  // Region change handler
  const handleRegionChange = (newReg: string) => {
    if (newReg === 'ALL') {
      onFilterChange({ region: 'ALL', province: 'ALL', city: 'ALL', kecamatan: 'ALL' });
      return;
    }

    // Check if current province belongs to new region
    const provsInRegion = effectiveHierarchy && effectiveHierarchy[newReg] ? Object.keys(effectiveHierarchy[newReg]) : [];
    const keepProv = provsInRegion.includes(filters.province);
    const targetProv = keepProv ? filters.province : 'ALL';

    // Check city
    let targetCity = 'ALL';
    if (targetProv !== 'ALL' && effectiveHierarchy && effectiveHierarchy[newReg]?.[targetProv]) {
      const citiesInProv = Object.keys(effectiveHierarchy[newReg][targetProv]);
      if (citiesInProv.includes(filters.city)) {
        targetCity = filters.city;
      }
    }

    onFilterChange({
      region: newReg,
      province: targetProv,
      city: targetCity,
      kecamatan: 'ALL'
    });
  };

  // Province change handler
  const handleProvinceChange = (newProv: string) => {
    if (newProv === 'ALL') {
      onFilterChange({ province: 'ALL', city: 'ALL', kecamatan: 'ALL' });
      return;
    }

    // Auto find parent region
    let parentReg = filters.region;
    if (effectiveHierarchy) {
      for (const reg in effectiveHierarchy) {
        if (effectiveHierarchy[reg][newProv]) {
          parentReg = reg;
          break;
        }
      }
    }

    // Check city
    let targetCity = 'ALL';
    if (effectiveHierarchy && effectiveHierarchy[parentReg]?.[newProv]) {
      const citiesInProv = Object.keys(effectiveHierarchy[parentReg][newProv]);
      if (citiesInProv.includes(filters.city)) {
        targetCity = filters.city;
      }
    }

    onFilterChange({
      region: parentReg,
      province: newProv,
      city: targetCity,
      kecamatan: 'ALL'
    });
  };

  // City change handler
  const handleCityChange = (newCity: string) => {
    if (newCity === 'ALL') {
      onFilterChange({ city: 'ALL', kecamatan: 'ALL' });
      return;
    }

    // Auto detect parent province & region
    let parentProv = filters.province;
    let parentReg = filters.region;
    if (effectiveHierarchy) {
      for (const reg in effectiveHierarchy) {
        for (const prov in effectiveHierarchy[reg]) {
          if (effectiveHierarchy[reg][prov][newCity]) {
            parentReg = reg;
            parentProv = prov;
            break;
          }
        }
      }
    }

    onFilterChange({
      region: parentReg,
      province: parentProv,
      city: newCity,
      kecamatan: 'ALL'
    });
  };

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-72 sm:w-80'
      } ${
        isDarkMode
          ? 'bg-[#08122c] border-r border-blue-950/80 text-slate-100'
          : 'bg-white border-r border-slate-200 text-slate-900'
      } flex flex-col shrink-0 select-none transition-all duration-300 z-20 h-full`}
    >
      {/* Brand Header matching Image 3: XLSmart & Collapse */}
      <div
        className={`p-4 border-b flex items-center justify-between ${
          isDarkMode ? 'border-blue-950/80' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold shrink-0">
            <TowerIcon size={18} />
          </div>
          {!isCollapsed && (
            <span className="text-lg font-extrabold text-blue-500 tracking-tight">
              XLSmart
            </span>
          )}
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-1 rounded-lg transition cursor-pointer ${
            isDarkMode ? 'text-slate-400 hover:text-white hover:bg-blue-900/40' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title={isCollapsed ? 'Buka Sidebar' : 'Ciutkan Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* User Connection & Profile matching Image 3 */}
      {!isCollapsed ? (
        <div
          className={`p-4 border-b flex flex-col gap-1.5 ${
            isDarkMode ? 'border-blue-950/80 bg-[#050b18]/60' : 'border-slate-200 bg-slate-50/80'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
            <span className="text-xs font-bold text-emerald-400">Connected</span>
          </div>
          <div className="flex items-center justify-between gap-1 mt-1">
            <h3 className={`text-sm font-extrabold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{user.name}</h3>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold shrink-0 uppercase border flex items-center gap-1 ${
                isSuperAdmin
                  ? isDarkMode ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-100 text-amber-800 border-amber-300'
                  : isNasionalManager
                  ? isDarkMode ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-cyan-100 text-cyan-800 border-cyan-300'
                  : isRegionRole
                  ? isDarkMode ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-blue-100 text-blue-800 border-blue-300'
                  : isCityRole
                  ? isDarkMode ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-indigo-100 text-indigo-800 border-indigo-300'
                  : isDarkMode ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}
            >
              {isSuperAdmin && <ShieldCheck className="w-3 h-3 text-amber-400" />}
              {isNasionalManager && <Eye className="w-3 h-3 text-cyan-400" />}
              {isRegionRole && <MapPin className="w-3 h-3 text-blue-400" />}
              {isCityRole && <Building className="w-3 h-3 text-indigo-400" />}
              {isSuperAdmin
                ? 'SUPER ADMIN'
                : isNasionalManager
                ? 'NASIONAL (R/O)'
                : isRegionRole
                ? `REGION: ${user.scope}`
                : isCityRole
                ? `CITY: ${user.scope}`
                : user.scope || 'PROMOTER'}
            </span>
          </div>
          <p className={`text-[11px] font-mono truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{user.email}</p>
        </div>
      ) : (
        <div className={`p-3 border-b flex flex-col items-center ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mb-1"></span>
          <span className={`text-[9px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{user.scope?.substring(0, 3)}</span>
        </div>
      )}

      {/* Main 3 Modules Navigation List matching Image 3 */}
      <div className={`p-3 flex flex-col gap-1.5 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
        {!isCollapsed && (
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 mb-1 ${
            isDarkMode ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Modul Utama
          </span>
        )}

        {/* 1. GRID Promoter */}
        <button
          onClick={() => onSelectModule('grid')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeModule === 'grid'
              ? isDarkMode
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-sm'
                : 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
              : isDarkMode
              ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="1. GRID Promoter (Peta GIS, Analisis Grid & BTS)"
        >
          <Compass
            className={`w-4 h-4 shrink-0 ${
              activeModule === 'grid' ? (isDarkMode ? 'text-amber-400 animate-pulse' : 'text-amber-600 animate-pulse') : (isDarkMode ? 'text-slate-400' : 'text-slate-500')
            }`}
          />
          {!isCollapsed && (
            <span className="flex-1 text-left font-extrabold">GRID Promoter</span>
          )}
        </button>

        {/* 2. FORM POI */}
        <button
          onClick={() => onSelectModule('form_poi')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeModule === 'form_poi'
              ? isDarkMode
                ? 'bg-orange-600/20 text-orange-300 border border-orange-500/40 shadow-sm'
                : 'bg-orange-50 text-orange-700 border border-orange-200 shadow-xs'
              : isDarkMode
              ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="2. Survey & Update POI (Input Data POI, GPS & Foto)"
        >
          <FileEdit
            className={`w-4 h-4 shrink-0 ${
              activeModule === 'form_poi' ? (isDarkMode ? 'text-orange-400' : 'text-orange-600') : (isDarkMode ? 'text-slate-400' : 'text-slate-500')
            }`}
          />
          {!isCollapsed && (
            <div className="flex-1 text-left flex items-center justify-between">
              <span className="font-extrabold truncate">Survey & Update POI</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono shrink-0 ml-1 ${
                isDarkMode ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-800'
              }`}>
                Foto & GPS
              </span>
            </div>
          )}
        </button>

        {/* 3. Network Check */}
        <button
          onClick={() => onSelectModule('network_check')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeModule === 'network_check'
              ? isDarkMode
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs'
              : isDarkMode
              ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="3. Network Check (Live Speed Test & Latency)"
        >
          <Activity
            className={`w-4 h-4 shrink-0 ${
              activeModule === 'network_check' ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600') : (isDarkMode ? 'text-slate-400' : 'text-slate-500')
            }`}
          />
          {!isCollapsed && (
            <div className="flex-1 text-left flex items-center justify-between">
              <span className="font-extrabold">Network Check</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                isDarkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
              }`}>
                Speed Test
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Middle Scrollable Section: Filters (When in GRID Promoter module) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {activeModule === 'grid' && !isCollapsed && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-400" />
                <span>Filter Wilayah</span>
              </span>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-[10px] text-blue-400 hover:underline"
              >
                {showFilters ? 'Tutup' : 'Buka'}
              </button>
            </div>

            {showFilters && (
              <>
                {/* Role-based Hierarchy Scope Notice - Hidden for non-admin roles as requested */}
                {isSuperAdmin && isRegionRole && (
                  <div className="bg-blue-950/60 border border-blue-500/30 rounded-lg p-2.5 flex items-start gap-2 text-xs text-blue-200 shadow-sm">
                    <Lock className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-[11px] text-blue-300 flex items-center gap-1">
                        Scope Terkunci: REGION {user.scope}
                      </div>
                      <div className="text-[10px] text-blue-300/80 leading-relaxed mt-0.5">
                        Akses dibatasi khusus untuk data di wilayah region ini.
                      </div>
                    </div>
                  </div>
                )}

                {isSuperAdmin && isCityRole && (
                  <div className="bg-indigo-950/60 border border-indigo-500/30 rounded-lg p-2.5 flex items-start gap-2 text-xs text-indigo-200 shadow-sm">
                    <Lock className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-[11px] text-indigo-300 flex items-center gap-1">
                        Scope Terkunci: CITY {user.scope}
                      </div>
                      <div className="text-[10px] text-indigo-300/80 leading-relaxed mt-0.5">
                        Akses dibatasi khusus untuk data di kota/kabupaten ini.
                      </div>
                    </div>
                  </div>
                )}

                {isNasionalManager && (
                  <div className="bg-cyan-950/60 border border-cyan-500/30 rounded-lg p-2.5 flex items-start gap-2 text-xs text-cyan-200 shadow-sm">
                    <Eye className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-[11px] text-cyan-300 flex items-center gap-1">
                        Akses Nasional (Read-Only)
                      </div>
                      <div className="text-[10px] text-cyan-300/80 leading-relaxed mt-0.5">
                        Akses pantau seluruh wilayah Indonesia tanpa izin edit/tambah data.
                      </div>
                    </div>
                  </div>
                )}

                {/* REGION */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`text-[10px] font-bold uppercase tracking-wider block ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      REGION
                    </label>
                    {(isRegionRole || isCityRole) && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold flex items-center gap-1 border ${
                        isDarkMode
                          ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                          : 'bg-blue-100 text-blue-800 border-blue-300'
                      }`}>
                        <Lock className="w-2.5 h-2.5" /> Terkunci
                      </span>
                    )}
                  </div>
                  <select
                    value={isRegionRole ? user.scope : (isCityRole ? (cityParentInfo?.region || filters.region) : filters.region)}
                    onChange={(e) => handleRegionChange(e.target.value)}
                    disabled={isRegionRole || isCityRole}
                    className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                      isDarkMode
                        ? isRegionRole || isCityRole
                          ? 'bg-slate-950/60 border-slate-800 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-950 border-slate-800 text-white focus:outline-none focus:border-blue-500 cursor-pointer'
                        : isRegionRole || isCityRole
                        ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer'
                    }`}
                  >
                    {!isRegionRole && !isCityRole && <option value="ALL">Semua Region</option>}
                    {availableRegions.map((reg) => (
                      <option key={reg} value={reg}>
                        {reg} {isRegionRole ? '(Scope Anda)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* PROVINSI */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`text-[10px] font-bold uppercase tracking-wider block ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      PROVINSI
                    </label>
                    {isCityRole && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold flex items-center gap-1 border ${
                        isDarkMode
                          ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                          : 'bg-indigo-100 text-indigo-800 border-indigo-300'
                      }`}>
                        <Lock className="w-2.5 h-2.5" /> Terkunci
                      </span>
                    )}
                  </div>
                  <select
                    value={isCityRole ? (cityParentInfo?.province || filters.province) : filters.province}
                    onChange={(e) => handleProvinceChange(e.target.value)}
                    disabled={isCityRole}
                    className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                      isDarkMode
                        ? isCityRole
                          ? 'bg-slate-950/60 border-slate-800 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-950 border-slate-800 text-white focus:outline-none focus:border-blue-500 cursor-pointer'
                        : isCityRole
                        ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer'
                    }`}
                  >
                    {!isCityRole && (
                      <option value="ALL">
                        {isRegionRole ? `Semua Provinsi (${user.scope})` : 'Semua Provinsi'}
                      </option>
                    )}
                    {availableProvinces.map((prov) => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
                  </select>
                </div>

                {/* KOTA / KABUPATEN */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`text-[10px] font-bold uppercase tracking-wider block ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      KOTA / KABUPATEN
                    </label>
                    {isCityRole && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold flex items-center gap-1 border ${
                        isDarkMode
                          ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                          : 'bg-indigo-100 text-indigo-800 border-indigo-300'
                      }`}>
                        <Lock className="w-2.5 h-2.5" /> Terkunci
                      </span>
                    )}
                  </div>
                  <select
                    value={isCityRole ? user.scope : filters.city}
                    onChange={(e) => handleCityChange(e.target.value)}
                    disabled={isCityRole}
                    className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                      isDarkMode
                        ? isCityRole
                          ? 'bg-slate-950/60 border-slate-800 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-950 border-slate-800 text-white focus:outline-none focus:border-blue-500 cursor-pointer'
                        : isCityRole
                        ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer'
                    }`}
                  >
                    {!isCityRole && (
                      <option value="ALL">
                        {isRegionRole ? `Semua Kota/Kabupaten (${user.scope})` : 'Semua Kota/Kabupaten'}
                      </option>
                    )}
                    {availableCities.map((city) => (
                      <option key={city} value={city}>
                        {city} {isCityRole ? '(Scope Anda)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* KECAMATAN */}
                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    KECAMATAN
                  </label>
                  <select
                    value={filters.kecamatan}
                    onChange={(e) => onFilterChange({ kecamatan: e.target.value })}
                    className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer ${
                      isDarkMode
                        ? 'bg-slate-950 border-slate-800 text-white focus:outline-none focus:border-blue-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500'
                    }`}
                  >
                    <option value="ALL">
                      {isCityRole
                        ? `Semua Kecamatan (${user.scope})`
                        : isRegionRole
                        ? `Semua Kecamatan (${user.scope})`
                        : 'Semua Kecamatan'}
                    </option>
                    {dynamicKecamatans.map((kec) => (
                      <option key={kec} value={kec}>
                        {kec}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search Bar */}
                <div className={`space-y-1.5 pt-1 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                  <label className={`text-[10px] font-bold uppercase tracking-wider block ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    Cari Grid / BTS
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Cari ID / Nama..."
                      value={filters.searchQuery}
                      onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
                      className={`w-full border rounded-lg pl-8 pr-3 py-1.5 text-xs font-medium ${
                        isDarkMode
                          ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500'
                          : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500'
                      }`}
                    />
                    <Search className={`w-3.5 h-3.5 absolute left-2.5 top-2.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                  </div>
                </div>

                {/* Kategori Grid Checkboxes with Synchronized Colors */}
                <div className={`space-y-1.5 pt-1 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`text-[10px] font-bold uppercase tracking-wider block ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      Kategori Prioritas Grid
                    </label>
                    <span className={`text-[9px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Status & Warna</span>
                  </div>
                  {(
                    [
                      '1st Priority Acquisition',
                      '2nd Priority Acquisition',
                      '3rd Priority',
                      'Avoid Cannibalism'
                    ] as GridCategory[]
                  ).map((cat) => {
                    const theme = CATEGORY_THEMES[cat];
                    const isChecked = filters.categories[cat];
                    const catCount = grids
                      ? grids.filter((g) => (g['SF Grid Category'] || g.SF_Grid_Category || g.cat) === cat).length
                      : 0;

                    return (
                      <label
                        key={cat}
                        className={`flex items-center justify-between text-xs px-2 py-1.5 rounded-lg border transition cursor-pointer ${
                          isChecked
                            ? isDarkMode
                              ? 'bg-slate-900/90 border-slate-700/80 text-white'
                              : 'bg-blue-50/80 border-blue-200 text-slate-900 font-semibold'
                            : isDarkMode
                            ? 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-900/50'
                            : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleCategoryToggle(cat)}
                            className={`rounded cursor-pointer shrink-0 ${
                              isDarkMode ? 'border-slate-700 bg-slate-950 text-blue-500' : 'border-slate-300 bg-white text-blue-600'
                            }`}
                          />
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                            style={{ backgroundColor: theme.hex }}
                          />
                          <div className="flex items-center gap-1 truncate text-[11px]">
                            <span className="font-medium">{cat}</span>
                          </div>
                        </div>
                        {catCount > 0 && (
                          <span className={`font-mono text-[10px] font-semibold ml-1 shrink-0 px-1 rounded border ${
                            isDarkMode
                              ? 'text-slate-300 bg-slate-950/60 border-slate-800'
                              : 'text-slate-700 bg-white border-slate-200'
                          }`}>
                            {catCount.toLocaleString('id-ID')}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>

                {/* Reset Button */}
                <button
                  onClick={onReset}
                  className={`w-full ${
                    isDarkMode
                      ? 'bg-[#0c1836] hover:bg-[#122452] text-slate-300 hover:text-white border border-blue-900/50'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300'
                  } py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filter</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer matching Image 3: Theme Toggle & Logout */}
      <div
        className={`p-3 border-t flex flex-col gap-2 ${
          isDarkMode ? 'border-blue-950/80 bg-[#050b18]/80' : 'border-slate-200 bg-slate-50'
        }`}
      >
        {/* Theme Switcher Quick Toggle */}
        <div
          className={`p-1 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            isDarkMode ? 'bg-[#08122c] border-blue-900/60' : 'bg-white border-slate-200 shadow-2xs'
          }`}
        >
          {!isCollapsed && (
            <span
              className={`text-[10px] uppercase font-bold pl-2 ${
                isDarkMode ? 'text-blue-300/80' : 'text-slate-500'
              }`}
            >
              Theme
            </span>
          )}
          <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
            <button
              onClick={() => onToggleDarkMode(true)}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                isDarkMode
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-800'
              }`}
              title="Dark Mode (Biru Dongker)"
            >
              <Moon className="w-3.5 h-3.5" />
              {!isCollapsed && <span className="text-[10px]">Dark</span>}
            </button>
            <button
              onClick={() => onToggleDarkMode(false)}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                !isDarkMode
                  ? 'bg-blue-50 text-blue-700 shadow-2xs border border-blue-200 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Light Mode (Terang)"
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              {!isCollapsed && <span className="text-[10px]">Light</span>}
            </button>
          </div>
        </div>

        {/* Logout Button matching Image 3 */}
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            isDarkMode
              ? 'text-amber-400 hover:text-amber-300 hover:bg-blue-900/30'
              : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
          }`}
          title="Logout"
        >
          <span className="text-base">🚪</span>
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};
