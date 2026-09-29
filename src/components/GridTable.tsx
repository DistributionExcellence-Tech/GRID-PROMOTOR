import React, { useState } from 'react';
import type { GridItem, BTSItem, UserProfile } from '../types';
import { getCategoryTheme } from '../utils/categoryTheme';
import { deriveGridTelecomMetrics, formatMSAbsolute } from '../utils/telecomMetrics';
import { TowerIcon, GridPolygonIcon } from './TelecomIcons';
import {
  Search,
  Download,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Copy,
  Check,
  FileSpreadsheet,
  Grid,
  Radio,
  Users,
  Wifi,
  Signal
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface GridTableProps {
  grids: GridItem[];
  btsList?: BTSItem[];
  user?: UserProfile | null;
  onLocate: (grid: GridItem) => void;
  onLocateBTS?: (bts: BTSItem) => void;
  onEdit: (grid: GridItem) => void;
  onEditBTS?: (bts: BTSItem) => void;
  onDelete: (gridId: string) => void;
  onDeleteBTS?: (btsId: string) => void;
  isDarkMode?: boolean;
}

export const GridTable: React.FC<GridTableProps> = ({
  grids,
  btsList = [],
  user,
  onLocate,
  onLocateBTS,
  onEdit,
  onEditBTS,
  onDelete,
  onDeleteBTS,
  isDarkMode = true
}) => {
  const [activeTab, setActiveTab] = useState<'grid' | 'bts'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const pageSize = 15;

  // Filtered Grids matching all 23 database attributes
  const filteredGrids = grids.filter((g) => {
    const q = searchTerm.toLowerCase();
    const id = String(g.GRID_ID || g.id || '').toLowerCase();
    const region = String(g.REGION || g.Region || g.region || '').toLowerCase();
    const province = String(g.PROVINCE || g.Province || g.province || '').toLowerCase();
    const city = String(g.CITY || g.City || g.city || '').toLowerCase();
    const kecamatan = String(g.KECAMATAN || g.Kecamatan || g.kecamatan || '').toLowerCase();
    const rawCategory = g['SF Grid Category'] || g.SF_Grid_Category || g.cat || '';
    const theme = getCategoryTheme(rawCategory);
    const category = `${rawCategory} ${theme.colorLabel} ${theme.shortLabel}`.toLowerCase();
    const promotor = String(g['Mapping Promotor'] || g.prom || '').toLowerCase();
    const wkt = String(g['Geometry WKT'] || g.Geometry_WKT || '').toLowerCase();

    return (
      id.includes(q) ||
      region.includes(q) ||
      province.includes(q) ||
      city.includes(q) ||
      kecamatan.includes(q) ||
      category.includes(q) ||
      promotor.includes(q) ||
      wkt.includes(q)
    );
  });

  // Filtered BTS
  const filteredBTS = btsList.filter((b) => {
    const q = searchTerm.toLowerCase();
    const id = (b.id || '').toLowerCase();
    const sitename = (b.sitename || b.name || '').toLowerCase();
    const site_type = (b.site_type || b.type || '').toLowerCase();
    const site_func = (b['Site Function'] || b.site_function || b.func || '').toLowerCase();
    const province = (b.Province || b.province || '').toLowerCase();
    const city = (b.City || b.city || '').toLowerCase();
    const kec = (b.Kecamatan || b.kec || '').toLowerCase();
    const region = (b.Region || b.region || '').toLowerCase();
    const metaId = (b.GRID_META_ID || b.grid || '').toLowerCase();
    const revFlag = (b['Revenue Flag'] || b.rev || '').toLowerCase();
    const bsp = (b['BSP Data'] || b.bsp_data || '').toLowerCase();

    return (
      id.includes(q) ||
      sitename.includes(q) ||
      site_type.includes(q) ||
      site_func.includes(q) ||
      province.includes(q) ||
      city.includes(q) ||
      kec.includes(q) ||
      region.includes(q) ||
      metaId.includes(q) ||
      revFlag.includes(q) ||
      bsp.includes(q)
    );
  });

  const activeFilteredList = activeTab === 'grid' ? filteredGrids : filteredBTS;
  const totalPages = Math.ceil(activeFilteredList.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const pagedGrids = filteredGrids.slice(startIndex, startIndex + pageSize);
  const pagedBTS = filteredBTS.slice(startIndex, startIndex + pageSize);

  const formatRupiah = (val: number | string | undefined) => {
    if (val === undefined || val === null || val === '') return 'Rp 0';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
    if (isNaN(num)) return String(val);
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  const copyWktToClipboard = (id: string, wkt: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(wkt);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // 23 Exact database headers requested by user
  const getExportGridRows = () => {
    return filteredGrids.map((g) => {
      const gridId = g.GRID_ID || g.id;
      const sfCat = g['SF Grid Category'] || g.SF_Grid_Category || g.cat || 'Avoid Cannibalism';
      const lat = typeof g['Center Lat'] === 'number'
        ? g['Center Lat']
        : (g.latitude !== undefined ? g.latitude : g.center?.[0] ?? -7.05);
      const lng = typeof g['Center Long'] === 'number'
        ? g['Center Long']
        : (g.longitude !== undefined ? g.longitude : g.center?.[1] ?? 112.9);

      const pop = typeof g.POPULATION === 'number' ? g.POPULATION : (g.pop ?? 5000);
      const bts = typeof g.TOTAL_BTS === 'number' ? g.TOTAL_BTS : (g.bts ?? 0);
      const poi = typeof g.TOTAL_POI === 'number' ? g.TOTAL_POI : (g.poi ?? 0);

      const derived = deriveGridTelecomMetrics(gridId, sfCat, g, bts);
      const msXLCo = (g['MS_XLCo.'] !== undefined && g['MS_XLCo.'] !== null && String(g['MS_XLCo.']).trim() !== '')
        ? formatMSAbsolute(g['MS_XLCo.'])
        : (g.xlco ? formatMSAbsolute(g.xlco) : derived.msXLCo);

      const msSF = (g.MS_SF !== undefined && g.MS_SF !== null && String(g.MS_SF).trim() !== '')
        ? formatMSAbsolute(g.MS_SF)
        : (g.sf ? formatMSAbsolute(g.sf) : derived.msSF);

      const msIM3 = (g.MS_IM3 !== undefined && g.MS_IM3 !== null && String(g.MS_IM3).trim() !== '')
        ? formatMSAbsolute(g.MS_IM3)
        : (g.im3 ? formatMSAbsolute(g.im3) : derived.msIM3);

      const ms3TRI = (g.MS_3TRI !== undefined && g.MS_3TRI !== null && String(g.MS_3TRI).trim() !== '')
        ? formatMSAbsolute(g.MS_3TRI)
        : (g.tri ? formatMSAbsolute(g.tri) : derived.ms3TRI);

      const msTSEL = (g.MS_TSEL !== undefined && g.MS_TSEL !== null && String(g.MS_TSEL).trim() !== '')
        ? formatMSAbsolute(g.MS_TSEL)
        : (g.tsel ? formatMSAbsolute(g.tsel) : derived.msTSEL);

      const msXLS = (g.MS_XLS !== undefined && g.MS_XLS !== null && String(g.MS_XLS).trim() !== '')
        ? formatMSAbsolute(g.MS_XLS)
        : (g.xls || g.xl ? formatMSAbsolute(g.xls || g.xl) : derived.msXLS);

      const msIOH = (g.MS_IOH !== undefined && g.MS_IOH !== null && String(g.MS_IOH).trim() !== '')
        ? formatMSAbsolute(g.MS_IOH)
        : (g.ioh ? formatMSAbsolute(g.ioh) : derived.msIOH);

      const p10XLCo = (g.P10_DL_Speed_XLCo !== undefined && g.P10_DL_Speed_XLCo !== null && String(g.P10_DL_Speed_XLCo).trim() !== '')
        ? String(g.P10_DL_Speed_XLCo)
        : (g.Download_Speed_XLCo ? `${g.Download_Speed_XLCo} Mbps` : derived.p10XLCo);

      const p10SF = (g.P10_DL_Speed_SF !== undefined && g.P10_DL_Speed_SF !== null && String(g.P10_DL_Speed_SF).trim() !== '')
        ? String(g.P10_DL_Speed_SF)
        : (g.Download_Speed_SF ? `${g.Download_Speed_SF} Mbps` : derived.p10SF);

      const btsResidential = (g.TOTAL_BTS_RESIDENTIAL !== undefined && g.TOTAL_BTS_RESIDENTIAL !== null && String(g.TOTAL_BTS_RESIDENTIAL).trim() !== '')
        ? (typeof g.TOTAL_BTS_RESIDENTIAL === 'number' ? g.TOTAL_BTS_RESIDENTIAL : (parseInt(String(g.TOTAL_BTS_RESIDENTIAL)) || 0))
        : derived.totalBtsResidential;

      const geom = g.geometry ? (typeof g.geometry === 'object' ? JSON.stringify(g.geometry) : g.geometry) : (g['Geometry WKT'] || g.Geometry_WKT || '');

      return {
        GRID_ID: gridId,
        REGION: g.REGION || g.Region || g.region || 'NORTHERN SUMATRA',
        PROVINCE: g.PROVINCE || g.Province || g.province || 'ACEH',
        CITY: g.CITY || g.City || g.city || 'KOTA SABANG',
        KECAMATAN: g.KECAMATAN || g.Kecamatan || g.kecamatan || 'SUKAKARYA',
        'SF Grid Category': sfCat,
        'Mapping Promotor': g['Mapping Promotor'] || g.prom || 'N/A',
        'Center Long': lng,
        'Center Lat': lat,
        POPULATION: pop,
        'MS_XLCo.': msXLCo,
        MS_SF: msSF,
        MS_IM3: msIM3,
        MS_3TRI: ms3TRI,
        MS_TSEL: msTSEL,
        MS_XLS: msXLS,
        MS_IOH: msIOH,
        P10_DL_Speed_XLCo: p10XLCo,
        P10_DL_Speed_SF: p10SF,
        TOTAL_POI: poi,
        TOTAL_BTS: bts,
        TOTAL_BTS_RESIDENTIAL: btsResidential,
        geometry: geom
      };
    });
  };

  const getExportBTSRows = () => {
    return filteredBTS.map((b) => {
      const lat = b.latitude ?? b.lat ?? 0;
      const lng = b.ongitude ?? b.longitude ?? b.lng ?? 0;
      return {
        id: b.id,
        sitename: b.sitename || b.name || `Tower ${b.id}`,
        'Aging (Month)': b['Aging (Month)'] ?? b.aging_month ?? 24,
        site_type: b.site_type || b.type || 'Macro',
        'Site Function': b['Site Function'] || b.site_function || b.func || 'Residential',
        Province: b.Province || b.province || 'JAWA TIMUR (4672)',
        City: b.City || b.city || 'KAB. BANGKALAN',
        Kecamatan: b.Kecamatan || b.kec || '',
        Region: b.Region || b.region || 'EAST JAVA',
        latitude: lat,
        ongitude: lng,
        GRID_META_ID: b.GRID_META_ID || b.grid || `GM-${b.id}`,
        'Rev.2026': b['Rev.2026'] ?? b.Rev_2026 ?? 45000000,
        'Revenue Flag': b['Revenue Flag'] || b.rev || 'Rev >40 Mn',
        'BSP Data': b['BSP Data'] || b.bsp_data || 'Smartfren Fiber Core',
        'Geometry WKT': b['Geometry WKT'] || b.Geometry_WKT || `POINT(${lng} ${lat})`
      };
    });
  };

  const downloadRawGrid = (format: 'xlsx' | 'csv' = 'xlsx') => {
    const exportData = getExportGridRows();
    const ws = XLSX.utils.json_to_sheet(exportData);
    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'GRID_Master');
      XLSX.writeFile(wb, `GRID_Raw_Data_23Headers_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else {
      const csvContent = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GRID_Raw_Data_23Headers_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const downloadRawBTS = (format: 'xlsx' | 'csv' = 'xlsx') => {
    const exportData = getExportBTSRows();
    const ws = XLSX.utils.json_to_sheet(exportData);
    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'BTS_Master');
      XLSX.writeFile(wb, `BTS_Raw_Data_16Headers_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else {
      const csvContent = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BTS_Raw_Data_16Headers_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const exportExcel = () => {
    if (activeTab === 'grid') {
      downloadRawGrid('xlsx');
    } else {
      downloadRawBTS('xlsx');
    }
  };

  const exportCSV = () => {
    if (activeTab === 'grid') {
      downloadRawGrid('csv');
    } else {
      downloadRawBTS('csv');
    }
  };

  const downloadGridTemplate = (format: 'xlsx' | 'csv' = 'csv') => {
    const templateRows = [
      {
        GRID_ID: 13222033321133,
        REGION: 'NORTHERN SUMATRA',
        PROVINCE: 'ACEH',
        CITY: 'KOTA SABANG',
        KECAMATAN: 'SUKAKARYA',
        'SF Grid Category': '1st Priority Acquisition',
        'Mapping Promotor': 'N/A',
        'Center Long': 95.26245117,
        'Center Lat': 5.889260453,
        POPULATION: 119,
        'MS_XLCo.': '12.2',
        MS_SF: '0.0',
        MS_IM3: '6.9',
        MS_3TRI: '5.8',
        MS_TSEL: '75.1',
        MS_XLS: '12.2',
        MS_IOH: '12.7',
        P10_DL_Speed_XLCo: '> 3Mb',
        P10_DL_Speed_SF: '< 3Mb',
        TOTAL_POI: 0,
        TOTAL_BTS: 0,
        TOTAL_BTS_RESIDENTIAL: 0,
        geometry: '{"type":"Polygon","coordinates":[[[95.251465,5.900189],[95.273438,5.900189],[95.273438,5.878332],[95.251465,5.878332],[95.251465,5.900189]]]}'
      },
      {
        GRID_ID: 13222033321134,
        REGION: 'NORTHERN SUMATRA',
        PROVINCE: 'ACEH',
        CITY: 'KOTA SABANG',
        KECAMATAN: 'SUKAJAYA',
        'SF Grid Category': '2nd Priority Acquisition',
        'Mapping Promotor': 'N/A',
        'Center Long': 95.285123,
        'Center Lat': 5.871234,
        POPULATION: 245,
        'MS_XLCo.': '18.5',
        MS_SF: '14.2',
        MS_IM3: '10.1',
        MS_3TRI: '7.3',
        MS_TSEL: '49.9',
        MS_XLS: '18.5',
        MS_IOH: '17.4',
        P10_DL_Speed_XLCo: '> 3Mb',
        P10_DL_Speed_SF: '> 3Mb',
        TOTAL_POI: 1,
        TOTAL_BTS: 1,
        TOTAL_BTS_RESIDENTIAL: 1,
        geometry: '{"type":"Polygon","coordinates":[[[95.273438,5.878332],[95.295411,5.878332],[95.295411,5.856475],[95.273438,5.856475],[95.273438,5.878332]]]}'
      },
      {
        GRID_ID: 13222033321135,
        REGION: 'NORTHERN SUMATRA',
        PROVINCE: 'ACEH',
        CITY: 'KOTA SABANG',
        KECAMATAN: 'SUKAJAYA',
        'SF Grid Category': '3rd Priority',
        'Mapping Promotor': 'N/A',
        'Center Long': 95.307123,
        'Center Lat': 5.853234,
        POPULATION: 80,
        'MS_XLCo.': '25.0%',
        MS_SF: '3.5%',
        MS_IM3: '12.0%',
        MS_3TRI: '9.5%',
        MS_TSEL: '50.0%',
        MS_XLS: '25.0%',
        MS_IOH: '21.5%',
        P10_DL_Speed_XLCo: '> 3Mb',
        P10_DL_Speed_SF: '< 3Mb',
        TOTAL_POI: 0,
        TOTAL_BTS: 0,
        TOTAL_BTS_RESIDENTIAL: 0,
        geometry: '{"type":"Polygon","coordinates":[[[95.295411,5.856475],[95.317384,5.856475],[95.317384,5.834618],[95.295411,5.834618],[95.295411,5.856475]]]}'
      },
      {
        GRID_ID: 13222033321136,
        REGION: 'NORTHERN SUMATRA',
        PROVINCE: 'ACEH',
        CITY: 'KOTA SABANG',
        KECAMATAN: 'SUKAKARYA',
        'SF Grid Category': 'Avoid Cannibalism',
        'Mapping Promotor': 'N/A',
        'Center Long': 95.240451,
        'Center Lat': 5.86726,
        POPULATION: 310,
        'MS_XLCo.': '15.0%',
        MS_SF: '28.0%',
        MS_IM3: '11.0%',
        MS_3TRI: '6.0%',
        MS_TSEL: '40.0%',
        MS_XLS: '15.0%',
        MS_IOH: '17.0%',
        P10_DL_Speed_XLCo: '> 3Mb',
        P10_DL_Speed_SF: '> 3Mb',
        TOTAL_POI: 3,
        TOTAL_BTS: 2,
        TOTAL_BTS_RESIDENTIAL: 2,
        geometry: '{"type":"Polygon","coordinates":[[[95.229492,5.878332],[95.251465,5.878332],[95.251465,5.856475],[95.229492,5.856475],[95.229492,5.878332]]]}'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateRows);
    if (format === 'csv') {
      const csvContent = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Template_GRID_Master_23Headers.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'GRID_Template');
      XLSX.writeFile(wb, `Template_GRID_Master_23Headers.xlsx`);
    }
  };

  const downloadFullDatabaseCSV = () => {
    const a = document.createElement('a');
    a.href = '/api/grids/export/csv';
    a.download = `GRID_Database_Master_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div
      className={`${
        isDarkMode
          ? 'bg-[#0a1532] border-blue-900/50 text-slate-100 shadow-2xl shadow-[#040816]/60'
          : 'bg-white border-slate-200 text-slate-900 shadow-xl'
      } rounded-2xl border p-4 sm:p-5 overflow-hidden transition-colors`}
    >
      {/* Table Header Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`text-base sm:text-lg font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              GRID & BTS Detail
            </h3>
          </div>
        </div>

        {/* Tab & Search & Export Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Tab Selector: GRID vs BTS */}
          <div
            className={`p-1 rounded-xl flex items-center gap-1 border ${
              isDarkMode ? 'bg-[#060c1c] border-blue-900/60' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              onClick={() => {
                setActiveTab('grid');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'grid'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GridPolygonIcon size={14} />
              <span>GRID Detail ({grids.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('bts');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'bts'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TowerIcon size={14} />
              <span>BTS / Tower ({btsList.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-56">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={activeTab === 'grid' ? 'Cari Grid ID, Wilayah, Promotor...' : 'Cari BTS ID, Sitename, Wilayah...'}
              className={`w-full border rounded-lg pl-8 pr-3 py-1.5 text-xs font-medium transition focus:outline-none focus:border-blue-500 ${
                isDarkMode
                  ? 'bg-[#060c1c] border-blue-900/60 text-white placeholder:text-slate-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
              }`}
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          </div>

          {/* Download Raw Data GRID & BTS Actions */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Raw GRID Download Button */}
            <button
              onClick={() => downloadRawGrid('xlsx')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm border cursor-pointer ${
                activeTab === 'grid'
                  ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400/50 shadow-blue-900/30'
                  : isDarkMode
                  ? 'bg-[#060c1c] hover:bg-blue-950/60 text-blue-300 border-blue-900/60'
                  : 'bg-white hover:bg-blue-50 text-blue-700 border-blue-300'
              }`}
              title={`Download Raw Data GRID (${filteredGrids.length} Titik • 23 Kolom Database Standar) dalam format Excel`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-200" />
              <span>Download GRID</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-black/20 font-mono">.xlsx</span>
            </button>

            {/* Raw BTS Download Button */}
            <button
              onClick={() => downloadRawBTS('xlsx')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm border cursor-pointer ${
                activeTab === 'bts'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/50 shadow-emerald-900/30'
                  : isDarkMode
                  ? 'bg-[#060c1c] hover:bg-emerald-950/60 text-emerald-300 border-emerald-900/60'
                  : 'bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-300'
              }`}
              title={`Download Raw Data BTS (${filteredBTS.length} Tower • 16 Kolom Master) dalam format Excel`}
            >
              <TowerIcon size={13} />
              <span>Download BTS</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-black/20 font-mono">.xlsx</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table Content: GRID TAB (23 Exact Database Columns) */}
      {activeTab === 'grid' ? (
        <div
          className={`overflow-x-auto border rounded-xl max-h-[640px] ${
            isDarkMode ? 'border-blue-900/50 bg-[#070f24]' : 'border-slate-200 bg-white'
          }`}
        >
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10">
              <tr
                className={`${
                  isDarkMode
                    ? 'bg-[#08122c] text-blue-200 border-blue-900/60 shadow-[#050b18]/50'
                    : 'bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                } font-bold border-b uppercase tracking-wider text-[11px] whitespace-nowrap shadow-sm`}
              >
                <th className="p-3">GRID_ID</th>
                <th className="p-3">REGION</th>
                <th className="p-3">PROVINCE</th>
                <th className="p-3">CITY</th>
                <th className="p-3">KECAMATAN</th>
                <th className="p-3">SF Grid Category</th>
                <th className="p-3">Mapping Promotor</th>
                <th className="p-3 font-mono">Center Long</th>
                <th className="p-3 font-mono">Center Lat</th>
                <th className="p-3">Geometry WKT</th>
                <th className="p-3 text-right">POPULATION</th>
                <th className="p-3 text-center">MS_XLCo.</th>
                <th className="p-3 text-center">MS_SF</th>
                <th className="p-3 text-center">MS_IM3</th>
                <th className="p-3 text-center">MS_3TRI</th>
                <th className="p-3 text-center">MS_TSEL</th>
                <th className="p-3 text-center">MS_XLS</th>
                <th className="p-3 text-center">MS_IOH</th>
                <th className="p-3 text-right">P10_DL_Speed_XLCo</th>
                <th className={`p-3 text-right font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>P10_DL_Speed_SF</th>
                <th className="p-3 text-center">TOTAL_POI</th>
                <th className="p-3 text-center">
                  <span className="flex items-center justify-center gap-1">
                    <TowerIcon size={12} className="text-blue-400" />
                    <span>TOTAL_BTS</span>
                  </span>
                </th>
                <th className="p-3 text-center">TOTAL_BTS_RESIDENTIAL</th>
                <th
                  className={`p-3 text-center sticky right-0 ${
                    isDarkMode
                      ? 'bg-[#08122c] text-blue-200 border-l border-blue-900/60'
                      : 'bg-slate-100 text-slate-800 border-l border-slate-300 shadow-md'
                  }`}
                >
                  AKSI
                </th>
              </tr>
            </thead>
            <tbody
              className={`divide-y ${
                isDarkMode ? 'divide-blue-950/60 text-slate-200' : 'divide-slate-200 text-slate-800'
              } font-medium`}
            >
              {pagedGrids.length === 0 ? (
                <tr>
                  <td colSpan={24} className={`text-center py-12 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Tidak ada data grid yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                pagedGrids.map((item) => {
                  const gridId = item.GRID_ID || item.id;
                  const region = item.REGION || item.Region || item.region || 'EAST JAVA';
                  const province = item.PROVINCE || item.Province || item.province || 'JAWA TIMUR (4672)';
                  const city = item.CITY || item.City || item.city || 'KAB. BANGKALAN';
                  const kecamatan = item.KECAMATAN || item.Kecamatan || item.kecamatan || 'Bangkalan';
                  const sfCat = item['SF Grid Category'] || item.SF_Grid_Category || item.cat || 'Avoid Cannibalism';
                  const catTheme = getCategoryTheme(sfCat);
                  const promotor = item['Mapping Promotor'] || item.prom || 'MULTIBRAND';

                  const cLong = typeof item['Center Long'] === 'number'
                    ? item['Center Long']
                    : (item.longitude !== undefined ? item.longitude : item.center?.[1] ?? 112.9);
                  const cLat = typeof item['Center Lat'] === 'number'
                    ? item['Center Lat']
                    : (item.latitude !== undefined ? item.latitude : item.center?.[0] ?? -7.05);

                  const wkt = item['Geometry WKT'] || item.Geometry_WKT || `POLYGON((...))`;
                  const population = typeof item.POPULATION === 'number' ? item.POPULATION : (item.pop || 5000);

                  const totalPoi = typeof item.TOTAL_POI === 'number' ? item.TOTAL_POI : (item.poi || 0);
                  const totalBts = typeof item.TOTAL_BTS === 'number' ? item.TOTAL_BTS : (item.bts || 0);

                  const derived = deriveGridTelecomMetrics(gridId, sfCat, item, totalBts);

                  const msXLCo = (item['MS_XLCo.'] !== undefined && item['MS_XLCo.'] !== null && String(item['MS_XLCo.']).trim() !== '')
                    ? formatMSAbsolute(item['MS_XLCo.'])
                    : (item.xlco ? formatMSAbsolute(item.xlco) : derived.msXLCo);

                  const msSF = (item.MS_SF !== undefined && item.MS_SF !== null && String(item.MS_SF).trim() !== '')
                    ? formatMSAbsolute(item.MS_SF)
                    : (item.sf ? formatMSAbsolute(item.sf) : derived.msSF);

                  const msIM3 = (item.MS_IM3 !== undefined && item.MS_IM3 !== null && String(item.MS_IM3).trim() !== '')
                    ? formatMSAbsolute(item.MS_IM3)
                    : (item.im3 ? formatMSAbsolute(item.im3) : derived.msIM3);

                  const ms3TRI = (item.MS_3TRI !== undefined && item.MS_3TRI !== null && String(item.MS_3TRI).trim() !== '')
                    ? formatMSAbsolute(item.MS_3TRI)
                    : (item.tri ? formatMSAbsolute(item.tri) : derived.ms3TRI);

                  const msTSEL = (item.MS_TSEL !== undefined && item.MS_TSEL !== null && String(item.MS_TSEL).trim() !== '')
                    ? formatMSAbsolute(item.MS_TSEL)
                    : (item.tsel ? formatMSAbsolute(item.tsel) : derived.msTSEL);

                  const msXLS = (item.MS_XLS !== undefined && item.MS_XLS !== null && String(item.MS_XLS).trim() !== '')
                    ? formatMSAbsolute(item.MS_XLS)
                    : (item.xls || item.xl ? formatMSAbsolute(item.xls || item.xl) : derived.msXLS);

                  const msIOH = (item.MS_IOH !== undefined && item.MS_IOH !== null && String(item.MS_IOH).trim() !== '')
                    ? formatMSAbsolute(item.MS_IOH)
                    : (item.ioh ? formatMSAbsolute(item.ioh) : derived.msIOH);

                  const p10XLCo = (item.P10_DL_Speed_XLCo !== undefined && item.P10_DL_Speed_XLCo !== null && String(item.P10_DL_Speed_XLCo).trim() !== '')
                    ? String(item.P10_DL_Speed_XLCo)
                    : (item.Download_Speed_XLCo ? `${item.Download_Speed_XLCo} Mbps` : derived.p10XLCo);

                  const p10SF = (item.P10_DL_Speed_SF !== undefined && item.P10_DL_Speed_SF !== null && String(item.P10_DL_Speed_SF).trim() !== '')
                    ? String(item.P10_DL_Speed_SF)
                    : (item.Download_Speed_SF ? `${item.Download_Speed_SF} Mbps` : derived.p10SF);

                  const totalBtsRes = (item.TOTAL_BTS_RESIDENTIAL !== undefined && item.TOTAL_BTS_RESIDENTIAL !== null && String(item.TOTAL_BTS_RESIDENTIAL).trim() !== '')
                    ? (typeof item.TOTAL_BTS_RESIDENTIAL === 'number' ? item.TOTAL_BTS_RESIDENTIAL : (parseInt(String(item.TOTAL_BTS_RESIDENTIAL)) || 0))
                    : derived.totalBtsResidential;

                  return (
                    <tr
                      key={gridId}
                      className={`${
                        isDarkMode
                          ? 'hover:bg-blue-900/25 border-b border-blue-950/40 text-slate-200'
                          : 'hover:bg-slate-50 border-b border-slate-100 text-slate-800'
                      } transition group whitespace-nowrap`}
                    >
                      {/* 1. GRID_ID */}
                      <td className={`p-3 font-mono font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{gridId}</td>

                      {/* 2. REGION */}
                      <td className="p-3">{region}</td>

                      {/* 3. PROVINCE */}
                      <td className="p-3">{province}</td>

                      {/* 4. CITY */}
                      <td className={`p-3 font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{city}</td>

                      {/* 5. KECAMATAN */}
                      <td className={`p-3 font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{kecamatan}</td>

                      {/* 6. SF Grid Category */}
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold inline-flex items-center gap-1.5 border shadow-xs whitespace-nowrap ${
                            isDarkMode ? catTheme.badgeDark : catTheme.badgeLight
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: catTheme.hex }}
                          />
                          <span>{sfCat}</span>
                        </span>
                      </td>

                      {/* 7. Mapping Promotor */}
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          isDarkMode
                            ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                          {promotor}
                        </span>
                      </td>

                      {/* 8. Center Long */}
                      <td className={`p-3 font-mono text-[11px] ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{cLong.toFixed(6)}</td>

                      {/* 9. Center Lat */}
                      <td className={`p-3 font-mono text-[11px] ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{cLat.toFixed(6)}</td>

                      {/* 10. Geometry WKT */}
                      <td className={`p-3 max-w-[140px] truncate font-mono text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`} title={wkt}>
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{wkt.slice(0, 20)}...</span>
                          <button
                            onClick={() => copyWktToClipboard(gridId, wkt)}
                            className={`p-1 rounded transition cursor-pointer ${
                              isDarkMode ? 'hover:bg-blue-900/50 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600'
                            }`}
                            title="Salin Poligon WKT Lengkap"
                          >
                            {copiedId === gridId ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* 11. POPULATION */}
                      <td className={`p-3 text-right font-mono font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                        {population.toLocaleString('id-ID')}
                      </td>

                      {/* 12. MS_XLCo. */}
                      <td className={`p-3 text-center font-mono text-[11px] font-semibold ${
                        isDarkMode ? 'bg-blue-950/40 text-blue-300' : 'bg-blue-50/60 text-blue-800'
                      }`}>{msXLCo}</td>

                      {/* 13. MS_SF */}
                      <td className={`p-3 text-center font-mono text-[11px] font-bold border-x ${
                        isDarkMode
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-900/50'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>{msSF}</td>

                      {/* 14. MS_IM3 */}
                      <td className={`p-3 text-center font-mono text-[11px] ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{msIM3}</td>

                      {/* 15. MS_3TRI */}
                      <td className={`p-3 text-center font-mono text-[11px] ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{ms3TRI}</td>

                      {/* 16. MS_TSEL */}
                      <td className={`p-3 text-center font-mono text-[11px] font-semibold ${isDarkMode ? 'text-rose-400' : 'text-rose-700'}`}>{msTSEL}</td>

                      {/* 17. MS_XLS */}
                      <td className={`p-3 text-center font-mono text-[11px] ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{msXLS}</td>

                      {/* 18. MS_IOH */}
                      <td className={`p-3 text-center font-mono text-[11px] font-semibold ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>{msIOH}</td>

                      {/* 19. P10_DL_Speed_XLCo */}
                      <td className={`p-3 text-right font-mono ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{p10XLCo}</td>

                      {/* 20. P10_DL_Speed_SF */}
                      <td className={`p-3 text-right font-mono font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>{p10SF}</td>

                      {/* 21. TOTAL_POI */}
                      <td className={`p-3 text-center font-bold font-mono ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>{totalPoi}</td>

                      {/* 22. TOTAL_BTS */}
                      <td className={`p-3 text-center font-bold font-mono ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>{totalBts}</td>

                      {/* 23. TOTAL_BTS_RESIDENTIAL */}
                      <td className={`p-3 text-center font-semibold font-mono ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{totalBtsRes}</td>

                      {/* 24. AKSI */}
                      <td
                        className={`p-3 text-center sticky right-0 ${
                          isDarkMode
                            ? 'bg-[#0a1532] group-hover:bg-[#0e1d44] border-l border-blue-900/60 shadow-md text-slate-200'
                            : 'bg-white/95 group-hover:bg-slate-50/95 border-l border-slate-200 shadow-md text-slate-700'
                        } transition`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onLocate(item)}
                            className={`p-1.5 rounded transition cursor-pointer ${
                              isDarkMode ? 'hover:bg-blue-900/40 text-blue-400' : 'hover:bg-blue-50 text-blue-600'
                            }`}
                            title="Lihat Titik Grid di Peta"
                          >
                            <Compass className="w-3.5 h-3.5" />
                          </button>
                          {user?.role === 'ADMIN' ? (
                            <>
                              <button
                                onClick={() => onEdit(item)}
                                className={`p-1.5 rounded transition cursor-pointer ${
                                  isDarkMode ? 'hover:bg-blue-900/40 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                                }`}
                                title="Edit Grid (Super Admin)"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Hapus grid ${gridId} dari database?`)) {
                                    onDelete(gridId);
                                  }
                                }}
                                className={`p-1.5 rounded transition cursor-pointer ${
                                  isDarkMode ? 'hover:bg-red-950/60 text-red-400' : 'hover:bg-red-50 text-red-600'
                                }`}
                                title="Hapus Grid (Super Admin)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic px-1 font-medium select-none" title="Hanya Super Admin yang berhak mengedit data">
                              Read-Only
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Table Content: BTS TAB */
        <div
          className={`overflow-x-auto border rounded-xl max-h-[640px] ${
            isDarkMode ? 'border-blue-900/50 bg-[#070f24]' : 'border-slate-200 bg-white'
          }`}
        >
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10">
              <tr
                className={`${
                  isDarkMode
                    ? 'bg-[#08122c] text-blue-200 border-blue-900/60 shadow-[#050b18]/50'
                    : 'bg-slate-100 text-slate-700 border-slate-200 shadow-sm'
                } font-bold border-b uppercase tracking-wider text-[11px] whitespace-nowrap`}
              >
                <th className="p-3">ID</th>
                <th className="p-3">
                  <span className="flex items-center gap-1.5">
                    <TowerIcon size={13} className="text-emerald-400" />
                    <span>SITENAME / TOWER</span>
                  </span>
                </th>
                <th className="p-3">AGING</th>
                <th className="p-3">SITE TYPE</th>
                <th className="p-3">FUNCTION</th>
                <th className="p-3">PROVINCE</th>
                <th className="p-3">CITY</th>
                <th className="p-3">KECAMATAN</th>
                <th className="p-3">REGION</th>
                <th className="p-3">COORDINATES</th>
                <th className="p-3">GRID META ID</th>
                <th className="p-3">REVENUE FLAG</th>
                <th className="p-3">GEOMETRY WKT</th>
                <th
                  className={`p-3 text-center sticky right-0 ${
                    isDarkMode
                      ? 'bg-[#08122c] text-blue-200 border-l border-blue-900/60'
                      : 'bg-slate-100 text-slate-700 border-l border-slate-200 shadow-md'
                  }`}
                >
                  AKSI
                </th>
              </tr>
            </thead>
            <tbody
              className={`divide-y ${
                isDarkMode ? 'divide-blue-950/60 text-slate-200' : 'divide-slate-100 text-slate-700'
              } font-medium`}
            >
              {pagedBTS.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center py-12 text-slate-400 font-medium">
                    Tidak ada data BTS yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                pagedBTS.map((item) => {
                  const lat = item.latitude ?? item.lat ?? 0;
                  const lng = item.ongitude ?? item.longitude ?? item.lng ?? 0;
                  const aging = item['Aging (Month)'] ?? item.aging_month ?? 24;
                  const sitename = item.sitename || item.name || `Tower ${item.id}`;
                  const siteType = item.site_type || item.type || 'Macro';
                  const siteFunc = item['Site Function'] || item.site_function || item.func || 'Residential';
                  const metaId = item.GRID_META_ID || item.grid || `GM-${item.id}`;
                  const revFlag = item['Revenue Flag'] || item.rev || 'Rev >40 Mn';
                  const wkt = item['Geometry WKT'] || item.Geometry_WKT || `POINT(${lng} ${lat})`;

                  return (
                    <tr
                      key={item.id}
                      className={`${
                        isDarkMode
                          ? 'hover:bg-blue-900/25 border-b border-blue-950/40 text-slate-200'
                          : 'hover:bg-slate-50 border-b border-slate-100 text-slate-800'
                      } transition group whitespace-nowrap`}
                    >
                      {/* 1. id */}
                      <td className={`p-3 font-mono font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.id}</td>

                      {/* 2. sitename */}
                      <td className={`p-3 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 shadow-xs"
                            style={{
                              backgroundColor:
                                revFlag === 'Rev >40 Mn'
                                  ? '#3b82f6'
                                  : revFlag === 'Rev 30-40 Mn'
                                  ? '#10b981'
                                  : revFlag === 'Rev 20-30 Mn'
                                  ? '#f59e0b'
                                  : revFlag === 'Rev <20 Mn'
                                  ? '#ef4444'
                                  : '#64748b'
                            }}
                          >
                            <TowerIcon size={11} color="#ffffff" />
                          </div>
                          <span>{sitename}</span>
                        </div>
                      </td>

                      {/* 3. Aging */}
                      <td className="p-3 font-mono">{aging} Bln</td>

                      {/* 4. site_type */}
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isDarkMode
                              ? 'bg-blue-950/70 text-blue-300 border-blue-800/60'
                              : 'bg-slate-100 text-slate-800 border-slate-300'
                          }`}
                        >
                          {siteType}
                        </span>
                      </td>

                      {/* 5. Site Function */}
                      <td className="p-3">{siteFunc}</td>

                      {/* 6. Province */}
                      <td className="p-3">{item.Province || item.province || '-'}</td>

                      {/* 7. City */}
                      <td className="p-3">{item.City || item.city || '-'}</td>

                      {/* 8. Kecamatan */}
                      <td className={`p-3 font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.Kecamatan || item.kec || '-'}</td>

                      {/* 9. Region */}
                      <td className="p-3">{item.Region || item.region || '-'}</td>

                      {/* 10. Coordinates */}
                      <td className={`p-3 font-mono text-[11px] ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        {lat.toFixed(5)}, {lng.toFixed(5)}
                      </td>

                      {/* 11. GRID_META_ID */}
                      <td className={`p-3 font-mono font-semibold ${isDarkMode ? 'text-cyan-400' : 'text-blue-700'}`}>{metaId}</td>

                      {/* 12. Revenue Flag */}
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isDarkMode
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}>
                          {revFlag}
                        </span>
                      </td>

                      {/* 13. Geometry WKT */}
                      <td className={`p-3 max-w-[130px] truncate font-mono text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`} title={wkt}>
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{wkt.slice(0, 20)}...</span>
                          <button
                            onClick={() => copyWktToClipboard(item.id, wkt)}
                            className={`p-1 rounded transition cursor-pointer ${
                              isDarkMode ? 'hover:bg-blue-900/50 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600'
                            }`}
                            title="Salin Point WKT"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* 16. AKSI */}
                      <td
                        className={`p-3 text-center sticky right-0 ${
                          isDarkMode
                            ? 'bg-[#0a1532] group-hover:bg-[#0e1d44] border-l border-blue-900/60 shadow-md text-slate-200'
                            : 'bg-white/95 group-hover:bg-slate-50/95 border-l border-slate-200 shadow-md text-slate-700'
                        } transition`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onLocateBTS ? onLocateBTS(item) : onLocate({ center: [lat, lng] } as any)}
                            className={`p-1.5 rounded transition cursor-pointer ${
                              isDarkMode ? 'hover:bg-emerald-950/50 text-emerald-400' : 'hover:bg-emerald-50 text-emerald-600'
                            }`}
                            title="Lihat Titik BTS di Peta"
                          >
                            <Compass className="w-3.5 h-3.5" />
                          </button>
                          {user?.role === 'ADMIN' ? (
                            <>
                              <button
                                onClick={() => onEditBTS && onEditBTS(item)}
                                className={`p-1.5 rounded transition cursor-pointer ${
                                  isDarkMode ? 'hover:bg-blue-900/40 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                                }`}
                                title="Edit BTS (Super Admin)"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Hapus BTS ${item.id} dari database?`)) {
                                    onDeleteBTS ? onDeleteBTS(item.id) : onDelete(item.id);
                                  }
                                }}
                                className={`p-1.5 rounded transition cursor-pointer ${
                                  isDarkMode ? 'hover:bg-red-950/60 text-red-400' : 'hover:bg-red-50 text-red-600'
                                }`}
                                title="Hapus BTS (Super Admin)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic px-1 font-medium select-none" title="Hanya Super Admin yang berhak mengedit data">
                              Read-Only
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Table Pagination & Status Bar */}
      <div
        className={`flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-3 border-t text-xs ${
          isDarkMode ? 'border-blue-900/50 text-slate-400' : 'border-slate-200 text-slate-500'
        }`}
      >
        <div className="flex items-center gap-2">
          <span>
            Menampilkan <strong className={`${isDarkMode ? 'text-white' : 'text-slate-800'} font-bold`}>{activeFilteredList.length}</strong> {activeTab === 'grid' ? 'grid' : 'BTS tower'}
          </span>
          <span className="text-slate-400">•</span>
          <span className="flex items-center gap-1 text-emerald-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {activeTab === 'grid' ? '23 Header Database Grid Aktif' : '16 Atribut Data BTS Aktif'}
          </span>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className={`px-2 py-1 rounded border transition cursor-pointer ${
                isDarkMode
                  ? 'border-blue-900/60 bg-[#060c1c] text-slate-300 disabled:opacity-30 hover:bg-blue-950'
                  : 'border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className={`px-2 py-1 rounded border transition cursor-pointer ${
                isDarkMode
                  ? 'border-blue-900/60 bg-[#060c1c] text-slate-300 disabled:opacity-30 hover:bg-blue-950'
                  : 'border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50'
              }`}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
