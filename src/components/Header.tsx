import React from 'react';
import { Compass, Settings, LogOut, Database, RefreshCw, PlusCircle, Lock, ShieldCheck, Rocket, Folder, Map, SlidersHorizontal, Eye, MapPin, Building, Moon, Sun } from 'lucide-react';
import type { UserProfile } from '../types';
import { TowerIcon, GridPolygonIcon } from './TelecomIcons';

interface HeaderProps {
  user: UserProfile;
  currentView?: 'map' | 'cms';
  onToggleView?: (view: 'map' | 'cms') => void;
  onLogout: () => void;
  onOpenCMS: () => void;
  onOpenNewGrid: () => void;
  onResetDB: () => void;
  onOpenDeployGuide: () => void;
  activeFolderName?: string;
  isDbResetting?: boolean;
  isDarkMode?: boolean;
  onToggleDarkMode?: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  currentView = 'map',
  onToggleView,
  onLogout,
  onOpenCMS,
  onOpenNewGrid,
  onResetDB,
  onOpenDeployGuide,
  activeFolderName,
  isDbResetting,
  isDarkMode = true,
  onToggleDarkMode
}) => {
  const isSuperAdmin = user.role === 'ADMIN';
  const isNasionalManager = user.role === 'NASIONAL_MANAGER';
  const canAccessCMS = isSuperAdmin || isNasionalManager;

  return (
    <header
      className={`${
        isDarkMode
          ? 'bg-[#0a1532] border-blue-900/40 text-slate-100 shadow-lg shadow-[#040816]/60'
          : 'bg-white border-slate-200 text-slate-900 shadow-xs'
      } border-b px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 transition-colors`}
    >
      {/* Brand & Main View Switcher */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-amber-500 p-0.5 shadow-md flex items-center justify-center shrink-0">
            <div className={`w-full h-full rounded-[10px] ${isDarkMode ? 'bg-[#0a1532]' : 'bg-white'} flex items-center justify-center relative`}>
              <TowerIcon size={20} className="text-amber-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                GRID Promoter
              </h1>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-mono font-bold">
                v2.5 Folder & Live
              </span>
            </div>
            <p className={`text-xs font-medium ${isDarkMode ? 'text-blue-200' : 'text-slate-600'}`}>
              Grid Market Intelligence — prioritas akuisisi, POI & BTS per folder dataset
            </p>
          </div>
        </div>

        {/* View Switcher Tabs (Accessible to Super Admin & Nasional Manager) */}
        {canAccessCMS && onToggleView && (
          <div
            className={`p-1 rounded-xl border flex items-center gap-1 shadow-inner ml-0 sm:ml-2 ${
              isDarkMode ? 'bg-[#060c1c] border-blue-900/50' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              onClick={() => onToggleView('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                currentView === 'map'
                  ? 'bg-blue-600 text-white shadow'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>Peta GIS</span>
            </button>
            <button
              onClick={() => onToggleView('cms')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                currentView === 'cms'
                  ? isSuperAdmin
                    ? 'bg-amber-500 text-slate-950 shadow font-extrabold'
                    : 'bg-cyan-500 text-slate-950 shadow font-extrabold'
                  : isSuperAdmin
                  ? 'text-amber-400 hover:text-amber-300'
                  : 'text-cyan-400 hover:text-cyan-300'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Halaman CMS</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                  isSuperAdmin
                    ? 'bg-amber-400/20 text-amber-300'
                    : 'bg-cyan-400/20 text-cyan-300'
                }`}
              >
                {isSuperAdmin ? 'Admin' : 'Pantau (R/O)'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Actions & User State */}
      <div className="flex items-center flex-wrap gap-2.5">
        {/* THEME TOGGLE: Dark (Biru Dongker) vs Light */}
        {onToggleDarkMode && (
          <div
            className={`p-0.5 rounded-xl border flex items-center shadow-inner ${
              isDarkMode
                ? 'bg-[#060c1c] border-blue-900/60'
                : 'bg-slate-100 border-slate-300'
            }`}
          >
            <button
              type="button"
              onClick={() => onToggleDarkMode(true)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isDarkMode
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Theme: Dark (Biru Dongker)"
            >
              <Moon className="w-3.5 h-3.5 text-blue-200" />
              <span className="hidden sm:inline">Dark (Biru Dongker)</span>
              <span className="sm:hidden">Dark</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleDarkMode(false)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                !isDarkMode
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200 font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Theme: Light (Terang)"
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Light</span>
            </button>
          </div>
        )}

        {/* Add Grid Quick Action - Super Admin Only */}
        {isSuperAdmin && currentView === 'map' && (
          <button
            onClick={onOpenNewGrid}
            className={`border text-xs font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
              isDarkMode
                ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/30'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}
            title="Tambah Grid Manual ke Database (Super Admin Only)"
          >
            <PlusCircle className={`w-3.5 h-3.5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`} />
            <span>Tambah Grid</span>
          </button>
        )}

        {/* CMS Data Management Quick Button */}
        {canAccessCMS && (
          <button
            onClick={() => onToggleView ? onToggleView(currentView === 'cms' ? 'map' : 'cms') : onOpenCMS()}
            className={`${
              isDarkMode
                ? 'bg-[#0d1b3e] hover:bg-[#122452] text-blue-300 border-blue-500/30'
                : 'bg-slate-100 hover:bg-slate-200 text-blue-700 border-slate-300'
            } border text-xs font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>
              {currentView === 'cms'
                ? 'Buka Peta'
                : isSuperAdmin
                ? 'Kelola CMS'
                : 'Lihat CMS (R/O)'}
            </span>
          </button>
        )}

        {/* Reset Database to Seed for Super ADMIN */}
        {isSuperAdmin && (
          <button
            onClick={onResetDB}
            disabled={isDbResetting}
            className={`${
              isDarkMode
                ? 'bg-[#0d1b3e]/80 hover:bg-[#122452] text-slate-400 hover:text-slate-200 border-blue-900/40'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-300'
            } border text-xs font-medium px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer`}
            title="Reset dataset default database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isDbResetting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Reset Seed</span>
          </button>
        )}

        {/* Logout */}
        <button
          onClick={onLogout}
          className={`border text-xs font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
            isDarkMode
              ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
              : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-300'
          }`}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};
