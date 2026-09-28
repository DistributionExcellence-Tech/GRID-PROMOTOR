import React from 'react';
import { Target, TrendingUp, AlertCircle, ShieldAlert, MapPin } from 'lucide-react';
import type { KPIData } from '../types';
import { TowerIcon, GridPolygonIcon } from './TelecomIcons';
import { CATEGORY_THEMES } from '../utils/categoryTheme';

interface KPICardsProps {
  kpi: KPIData;
  poiCount?: number;
  loading?: boolean;
  isDarkMode?: boolean;
}

export const KPICards: React.FC<KPICardsProps> = ({ kpi, poiCount, loading, isDarkMode = true }) => {
  const displayPoiCount = kpi.poiCount ?? poiCount ?? 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
      {/* 1. #BTS (Sebelumnya #TOWER BTS) */}
      <div
        className={`${
          isDarkMode
            ? 'bg-[#0a1532]/95 border-blue-900/50 hover:border-blue-700/70 shadow-blue-950/30'
            : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs'
        } border rounded-xl p-3 text-center shadow-lg transition relative overflow-hidden group`}
      >
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <div className={`p-1 rounded-lg ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
            <TowerIcon size={16} />
          </div>
          <div
            className={`text-xl sm:text-2xl font-black ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            } tracking-tight font-mono`}
          >
            {loading ? '...' : kpi.towerCount.toLocaleString('id-ID')}
          </div>
        </div>
        <div
          className={`text-[10px] sm:text-[11px] ${
            isDarkMode ? 'text-blue-200 font-bold' : 'text-slate-700 font-bold'
          } uppercase tracking-wider flex items-center justify-center gap-1`}
        >
          <span>#BTS</span>
        </div>
      </div>

      {/* 2. #GRID (Sebelumnya #GRID POLIGON) */}
      <div
        className={`${
          isDarkMode
            ? 'bg-[#0a1532]/95 border-blue-900/50 hover:border-blue-700/70 shadow-blue-950/30'
            : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs'
        } border rounded-xl p-3 text-center shadow-lg transition relative overflow-hidden group`}
      >
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <div className={`p-1 rounded-lg ${isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
            <GridPolygonIcon size={16} />
          </div>
          <div
            className={`text-xl sm:text-2xl font-black ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            } tracking-tight font-mono`}
          >
            {loading ? '...' : kpi.gridCount.toLocaleString('id-ID')}
          </div>
        </div>
        <div
          className={`text-[10px] sm:text-[11px] ${
            isDarkMode ? 'text-blue-200 font-bold' : 'text-slate-700 font-bold'
          } uppercase tracking-wider flex items-center justify-center gap-1`}
        >
          <span>#GRID</span>
        </div>
      </div>

      {/* 3. #POI (Kotak Summary Baru) */}
      <div
        className={`${
          isDarkMode
            ? 'bg-[#0a1532]/95 border-blue-900/50 hover:border-cyan-500/70 shadow-blue-950/30'
            : 'bg-white border-slate-200 hover:border-cyan-300 shadow-xs'
        } border rounded-xl p-3 text-center shadow-lg transition relative overflow-hidden group`}
      >
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <div className={`p-1 rounded-lg ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
            <MapPin className="w-4 h-4 text-cyan-400" />
          </div>
          <div
            className={`text-xl sm:text-2xl font-black ${
              isDarkMode ? 'text-cyan-300' : 'text-cyan-700'
            } tracking-tight font-mono`}
          >
            {loading ? '...' : displayPoiCount.toLocaleString('id-ID')}
          </div>
        </div>
        <div
          className={`text-[10px] sm:text-[11px] ${
            isDarkMode ? 'text-cyan-200 font-bold' : 'text-cyan-800 font-bold'
          } uppercase tracking-wider flex items-center justify-center gap-1`}
        >
          <span>#POI</span>
        </div>
      </div>

      {/* 4. 1ST PRIORITY ACQUISITION (Hijau) */}
      <div
        className={`${
          isDarkMode
            ? 'bg-emerald-950/30 border-emerald-500/40 hover:border-emerald-500/70'
            : 'bg-emerald-50/80 border-emerald-300/80 hover:border-emerald-400'
        } border rounded-xl p-3 text-center shadow-lg transition`}
      >
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div
            className={`text-xl sm:text-2xl font-black ${
              isDarkMode ? 'text-emerald-400' : 'text-emerald-700'
            } tracking-tight font-mono`}
          >
            {loading ? '...' : kpi.p1Count.toLocaleString('id-ID')}
          </div>
        </div>
        <div
          className={`text-[10px] sm:text-[11px] ${
            isDarkMode ? 'text-emerald-300' : 'text-emerald-800'
          } uppercase font-bold tracking-wider flex items-center justify-center gap-1.5`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span>1ST PRIORITY</span>
        </div>
      </div>

      {/* 5. 2ND PRIORITY ACQUISITION */}
      <div
        className={`${
          isDarkMode
            ? 'bg-orange-950/30 border-orange-500/40 hover:border-orange-500/70'
            : 'bg-orange-50/80 border-orange-300/80 hover:border-orange-400'
        } border rounded-xl p-3 text-center shadow-lg transition`}
      >
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <div className="p-1 rounded-lg bg-orange-500/10 text-orange-400">
            <TrendingUp className="w-4 h-4 text-orange-400" />
          </div>
          <div
            className={`text-xl sm:text-2xl font-black ${
              isDarkMode ? 'text-orange-400' : 'text-orange-700'
            } tracking-tight font-mono`}
          >
            {loading ? '...' : kpi.p2Count.toLocaleString('id-ID')}
          </div>
        </div>
        <div
          className={`text-[10px] sm:text-[11px] ${
            isDarkMode ? 'text-orange-300' : 'text-orange-800'
          } uppercase font-bold tracking-wider flex items-center justify-center gap-1.5`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
          <span>2ND PRIORITY</span>
        </div>
      </div>

      {/* 6. 3RD PRIORITY */}
      <div
        className={`${
          isDarkMode
            ? 'bg-red-950/30 border-red-500/40 hover:border-red-500/70'
            : 'bg-red-50/80 border-red-300/80 hover:border-red-400'
        } border rounded-xl p-3 text-center shadow-lg transition`}
      >
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <div className="p-1 rounded-lg bg-red-500/10 text-red-400">
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <div
            className={`text-xl sm:text-2xl font-black ${
              isDarkMode ? 'text-red-400' : 'text-red-700'
            } tracking-tight font-mono`}
          >
            {loading ? '...' : kpi.p3Count.toLocaleString('id-ID')}
          </div>
        </div>
        <div
          className={`text-[10px] sm:text-[11px] ${
            isDarkMode ? 'text-red-300' : 'text-red-800'
          } uppercase font-bold tracking-wider flex items-center justify-center gap-1.5`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          <span>3RD PRIORITY</span>
        </div>
      </div>

      {/* 7. AVOID CANNIBALISM */}
      <div
        className={`${
          isDarkMode
            ? 'bg-slate-900/40 border-slate-600/40 hover:border-slate-500/70'
            : 'bg-slate-100 border-slate-300 hover:border-slate-400'
        } border rounded-xl p-3 text-center shadow-lg transition`}
      >
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <div className="p-1 rounded-lg bg-slate-500/10 text-slate-400">
            <ShieldAlert className="w-4 h-4 text-slate-400" />
          </div>
          <div
            className={`text-xl sm:text-2xl font-black ${
              isDarkMode ? 'text-slate-300' : 'text-slate-700'
            } tracking-tight font-mono`}
          >
            {loading ? '...' : kpi.cannibalCount.toLocaleString('id-ID')}
          </div>
        </div>
        <div
          className={`text-[10px] sm:text-[11px] ${
            isDarkMode ? 'text-slate-400' : 'text-slate-600'
          } uppercase font-bold tracking-wider flex items-center justify-center gap-1.5`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          <span>AVOID CANNIBALISM</span>
        </div>
      </div>
    </div>
  );
};

