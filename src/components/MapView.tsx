import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
// Ensure window.L is defined before leaflet.heat evaluates
if (typeof window !== 'undefined') {
  (window as any).L = L;
}
import 'leaflet.heat';

import type { GridItem, BTSItem, POIItem, UserProfile } from '../types';
import { CATEGORY_THEMES, getCategoryTheme } from '../utils/categoryTheme';
import { formatMSAbsolute } from '../utils/telecomMetrics';
import { TowerIcon, GridPolygonIcon, generateTowerMarkerHtml } from './TelecomIcons';
import {
  MapPin,
  Radio,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  Search,
  Flame,
  Sliders,
  Eye,
  EyeOff,
  TrendingUp,
  Activity,
  DollarSign,
  Sparkles,
  X,
  RotateCcw,
  Layers
} from 'lucide-react';

export type HeatmapMetric = 'revenue' | 'traffic' | 'priority';

interface MapViewProps {
  grids: GridItem[];
  btsList: BTSItem[];
  pois: POIItem[];
  user?: UserProfile | null;
  onSelectGrid?: (grid: GridItem) => void;
  onEditGrid?: (grid: GridItem) => void;
  onEditBTS?: (bts: BTSItem) => void;
  focusedLocation?: { lat: number; lng: number } | null;
  isDarkMode?: boolean;
}

// Gradient palettes for each heatmap mode
const HEATMAP_GRADIENTS = {
  revenue: {
    0.15: '#3b82f6', // Light Blue: < Rp 20 Mn
    0.35: '#06b6d4', // Cyan: Rp 20-25 Mn
    0.55: '#10b981', // Emerald Green: Rp 25-30 Mn
    0.75: '#f59e0b', // Amber: Rp 30-40 Mn
    0.92: '#ef4444'  // Intense Red: > Rp 40 Mn Hotspot
  },
  traffic: {
    0.15: '#0284c7', // Sky Blue: Low Traffic
    0.38: '#14b8a6', // Teal: Moderate Traffic
    0.62: '#eab308', // Yellow: Dense Subscribers
    0.82: '#f97316', // Orange: High Traffic Node
    0.95: '#dc2626'  // Deep Crimson: Extreme Traffic Node / Hotspot
  },
  priority: {
    0.12: '#475569', // Avoid Cannibalism (Slate)
    0.38: '#ef4444', // 3rd Priority (Red)
    0.68: '#f97316', // 2nd Priority (Orange)
    0.92: '#10b981'  // 1st Priority (Emerald Green)
  }
};

// Calculate revenue intensity (0.0 to 1.0)
export function getGridRevenueIntensity(grid: GridItem): number {
  let val = 0;
  if (typeof grid.Rev_August_2026 === 'number') {
    val = grid.Rev_August_2026;
  } else if (typeof grid.Rev_August_2026 === 'string') {
    const cleaned = grid.Rev_August_2026.replace(/[^0-9.]/g, '');
    val = parseFloat(cleaned) || 0;
  }

  if (val > 0) {
    // Standardize 0 - 50,000,000 IDR to 0.12 - 1.0
    return Math.min(1.0, Math.max(0.12, val / 48000000));
  }

  // Fallback to Revenue Flag string
  const flag = grid.Revenue_Flag || '';
  if (flag.includes('>40')) return 0.95;
  if (flag.includes('30-40')) return 0.75;
  if (flag.includes('20-30')) return 0.50;
  if (flag.includes('<20')) return 0.25;
  if (flag.includes('0')) return 0.05;
  return 0.25;
}

// Calculate traffic density intensity & score (0.0 to 1.0)
export function getGridTrafficIntensity(grid: GridItem): { intensity: number; score: number; level: string } {
  const pop = grid.pop || 5000;
  const poi = grid.poi || 0;
  const bts = grid.bts || 0;

  // Normalized factors
  const popScore = Math.min(1.0, pop / 12000);
  const poiScore = Math.min(1.0, poi / 8);
  const btsFactor = Math.min(1.0, bts / 3);

  let statusFactor = 1.0;
  const st = (grid.Device_Status || '').toLowerCase();
  if (st.includes('high load')) statusFactor = 1.35;
  else if (st.includes('degraded')) statusFactor = 0.85;
  else if (st.includes('offline') || st.includes('maintenance')) statusFactor = 0.45;

  const raw = (popScore * 0.45 + poiScore * 0.35 + btsFactor * 0.20) * statusFactor;
  const intensity = Math.min(1.0, Math.max(0.14, raw));
  const score = Math.round(intensity * 100);

  let level = 'Rendah';
  if (score >= 80) level = 'Sangat Padat (Hotspot)';
  else if (score >= 60) level = 'Tinggi';
  else if (score >= 40) level = 'Sedang';

  return { intensity, score, level };
}

// Calculate priority intensity
export function getGridPriorityIntensity(grid: GridItem): number {
  const cat = grid.SF_Grid_Category || grid.cat;
  if (cat === '1st Priority Acquisition') return 1.0;
  if (cat === '2nd Priority Acquisition') return 0.68;
  if (cat === '3rd Priority') return 0.38;
  return 0.08;
}

export const MapView: React.FC<MapViewProps> = ({
  grids,
  btsList,
  pois,
  user,
  onSelectGrid,
  onEditGrid,
  onEditBTS,
  focusedLocation,
  isDarkMode = true
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const gridLayersRef = useRef<L.LayerGroup | null>(null);
  const btsLayersRef = useRef<L.LayerGroup | null>(null);
  const poiLayersRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<any>(null);

  // Heatmap Overlay State
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapMetric>('revenue');
  const [heatmapRadius, setHeatmapRadius] = useState<number>(36);
  const [heatmapBlur, setHeatmapBlur] = useState<number>(22);
  const [heatmapMinOpacity, setHeatmapMinOpacity] = useState<number>(0.32);
  const [dimGridPolygons, setDimGridPolygons] = useState<boolean>(true);
  const [showHeatmapSettings, setShowHeatmapSettings] = useState<boolean>(false);
  const [isLegendCollapsed, setIsLegendCollapsed] = useState<boolean>(false);
  const [legendTab, setLegendTab] = useState<'grid' | 'bts'>('grid');

  // Map Theme State
  const [mapTheme, setMapTheme] = useState<'osm' | 'dark' | 'satellite'>(isDarkMode ? 'dark' : 'osm');

  // Sync map theme when isDarkMode changes
  useEffect(() => {
    setMapTheme(isDarkMode ? 'dark' : 'osm');
  }, [isDarkMode]);

  // Free Basemap Tile URLs
  const tileUrls = {
    osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    dark: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  };

  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // BTS Revenue Categories Config & State
  const BTS_REV_CONFIG = [
    { key: 'Rev >40 Mn', label: 'Rev >40 Mn', color: '#3b82f6' },
    { key: 'Rev 30-40 Mn', label: 'Rev 30-40 Mn', color: '#10b981' },
    { key: 'Rev 20-30 Mn', label: 'Rev 20-30 Mn', color: '#f59e0b' },
    { key: 'Rev <20 Mn', label: 'Rev <20 Mn', color: '#ef4444' },
    { key: 'Rev 0', label: 'Rev 0', color: '#78350f' },
    { key: 'Unknown', label: 'Unknown', color: '#64748b' }
  ];

  const [selectedBtsRevs, setSelectedBtsRevs] = useState<string[]>([
    'Rev >40 Mn',
    'Rev 30-40 Mn',
    'Rev 20-30 Mn',
    'Rev <20 Mn',
    'Rev 0',
    'Unknown'
  ]);
  const [showBtsDropdown, setShowBtsDropdown] = useState(false);

  // POI Categories Config & State
  const [selectedPoiTypes, setSelectedPoiTypes] = useState<string[]>([]);
  const [showPoiDropdown, setShowPoiDropdown] = useState(false);
  const [poiFilterSearch, setPoiFilterSearch] = useState('');

  // Extract all unique POI types from the data
  const allPoiTypes = Array.from(new Set(pois.map((p) => p.type))).filter(Boolean);

  const getPoiCategoryIcon = (type: string) => {
    const t = (type || '').toLowerCase().trim();
    if (t.includes('tourist') || t.includes('wisata') || t.includes('attraction')) return '🏞️';
    if (t.includes('park') || t.includes('taman')) return '🌳';
    if (t.includes('department') || t.includes('mall') || t.includes('plaza')) return '🏬';
    if (t.includes('amusement') || t.includes('hiburan') || t.includes('wahana')) return '🎡';
    if (t.includes('gas') || t.includes('spbu') || t.includes('bensin') || t.includes('fuel')) return '⛽';
    if (t.includes('bus') || t.includes('halte') || t.includes('terminal')) return '🚌';
    if (t.includes('community') || t.includes('balai') || t.includes('center') || t.includes('komunitas')) return '🏬';
    if (t.includes('govern') || t.includes('pemerintah') || t.includes('kantor') || t.includes('dinas')) return '🏛️';
    if (t.includes('hospital') || t.includes('rumah sakit') || t.includes('klinik') || t.includes('puskesmas') || t.includes('medik')) return '🏥';
    if (t.includes('supermarket') || t.includes('swalayan') || t.includes('hypermart') || t.includes('minimarket') || t.includes('indomaret') || t.includes('alfamart')) return '🛒';
    if (t.includes('market') || t.includes('pasar') || t.includes('toko') || t.includes('bunga')) return '🏪';
    if (t.includes('hotel') || t.includes('penginapan') || t.includes('villa') || t.includes('resort') || t.includes('inn')) return '🏨';
    if (t.includes('restaurant') || t.includes('resto') || t.includes('cafe') || t.includes('kuliner') || t.includes('warung') || t.includes('makan') || t.includes('food')) return '🍽️';
    if (t.includes('school') || t.includes('kampus') || t.includes('sekolah') || t.includes('universitas') || t.includes('sd') || t.includes('smp') || t.includes('sma')) return '🏫';
    if (t.includes('worship') || t.includes('mosque') || t.includes('masjid') || t.includes('musholla') || t.includes('church') || t.includes('gereja') || t.includes('temple') || t.includes('pura')) return '🕌';
    if (t.includes('bank') || t.includes('atm')) return '🏦';
    if (t.includes('pharmacy') || t.includes('apotek') || t.includes('obat')) return '💊';
    if (t.includes('transport') || t.includes('stasiun') || t.includes('station') || t.includes('kereta') || t.includes('train')) return '🚉';
    if (t.includes('airport') || t.includes('bandara')) return '✈️';
    if (t.includes('harbor') || t.includes('port') || t.includes('pelabuhan')) return '⚓';
    if (t.includes('police') || t.includes('polisi') || t.includes('pos')) return '👮';
    if (t.includes('outlet') || t.includes('store') || t.includes('counter') || t.includes('cell')) return '📱';
    return '📍';
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center default on Bangkalan / Madura (-7.05, 112.9)
    const map = L.map(mapContainerRef.current, {
      center: [-7.05, 112.95],
      zoom: 11,
      zoomControl: false,
      attributionControl: false
    });

    const tile = L.tileLayer(tileUrls[mapTheme], {
      maxZoom: 19
    }).addTo(map);

    tileLayerRef.current = tile;

    // Add layers
    gridLayersRef.current = L.layerGroup().addTo(map);
    btsLayersRef.current = L.layerGroup().addTo(map);
    poiLayersRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update base tile when mapTheme changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    tileLayerRef.current.setUrl(tileUrls[mapTheme]);
  }, [mapTheme]);

  // Handle external focus / flyTo
  useEffect(() => {
    if (focusedLocation && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([focusedLocation.lat, focusedLocation.lng], 15, {
        duration: 1.5
      });
    }
  }, [focusedLocation]);

  // Render Density / Revenue Heatmap Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove existing heatmap layer if any
    if (heatLayerRef.current) {
      mapInstanceRef.current.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (!showHeatmap || grids.length === 0) return;

    // Calculate intensity for each grid center
    const heatPoints: [number, number, number][] = [];

    grids.forEach((grid) => {
      const lat = grid.latitude !== undefined ? grid.latitude : grid.center?.[0];
      const lng = grid.longitude !== undefined ? grid.longitude : grid.center?.[1];

      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
        return;
      }

      let intensity = 0.5;

      if (heatmapMetric === 'revenue') {
        intensity = getGridRevenueIntensity(grid);
      } else if (heatmapMetric === 'traffic') {
        intensity = getGridTrafficIntensity(grid).intensity;
      } else if (heatmapMetric === 'priority') {
        intensity = getGridPriorityIntensity(grid);
      }

      heatPoints.push([lat, lng, intensity]);
    });

    if (heatPoints.length === 0) return;

    try {
      const currentGradient = HEATMAP_GRADIENTS[heatmapMetric] || HEATMAP_GRADIENTS.revenue;
      const heatLayer = (L as any).heatLayer(heatPoints, {
        radius: heatmapRadius,
        blur: heatmapBlur,
        maxZoom: 17,
        max: 1.0,
        minOpacity: heatmapMinOpacity,
        gradient: currentGradient
      });

      heatLayer.addTo(mapInstanceRef.current);
      heatLayerRef.current = heatLayer;
    } catch (err) {
      console.error('Error rendering heatLayer:', err);
    }
  }, [grids, showHeatmap, heatmapMetric, heatmapRadius, heatmapBlur, heatmapMinOpacity]);

  // Render Grids
  useEffect(() => {
    if (!gridLayersRef.current || !mapInstanceRef.current) return;
    gridLayersRef.current.clearLayers();

    if (grids.length === 0) return;

    const boundsGroup = L.featureGroup();

    grids.forEach((grid) => {
      // 23 Headers matching "tabel grid detail"
      const gridId = String(grid.GRID_ID || grid.id || '');
      const region = grid.REGION || grid.Region || grid.region || 'EAST JAVA';
      const province = grid.PROVINCE || grid.Province || grid.province || 'JAWA TIMUR (4672)';
      const city = grid.CITY || grid.City || grid.city || 'KAB. BANGKALAN';
      const kecamatan = grid.KECAMATAN || grid.Kecamatan || grid.kecamatan || 'Bangkalan';
      const sfCat = grid['SF Grid Category'] || grid.SF_Grid_Category || grid.cat || 'Avoid Cannibalism';
      const catTheme = getCategoryTheme(sfCat);
      const promotor = grid['Mapping Promotor'] || grid.prom || 'MULTIBRAND';

      const centerLat = typeof grid['Center Lat'] === 'number'
        ? grid['Center Lat']
        : (grid.latitude !== undefined ? grid.latitude : (grid.center?.[0] ?? -7.05));
      const centerLng = typeof grid['Center Long'] === 'number'
        ? grid['Center Long']
        : (grid.longitude !== undefined ? grid.longitude : (grid.center?.[1] ?? 112.9));

      const wkt = String(grid['Geometry WKT'] || grid.Geometry_WKT || '');
      const population = typeof grid.POPULATION === 'number' ? grid.POPULATION : (grid.pop || 5000);

      const msXLCo = formatMSAbsolute(grid['MS_XLCo.'] ?? grid.xlco ?? '0');
      const msSF = formatMSAbsolute(grid.MS_SF ?? grid.sf ?? '0');
      const msIM3 = formatMSAbsolute(grid.MS_IM3 ?? grid.im3 ?? '0');
      const ms3TRI = formatMSAbsolute(grid.MS_3TRI ?? grid.tri ?? '0');
      const msTSEL = formatMSAbsolute(grid.MS_TSEL ?? grid.tsel ?? '0');
      const msXLS = formatMSAbsolute(grid.MS_XLS ?? grid.xl ?? grid.xls ?? '0');
      const msIOH = formatMSAbsolute(grid.MS_IOH ?? grid.ioh ?? '0');

      const p10XLCo = String(grid.P10_DL_Speed_XLCo || '16.4 Mbps');
      const p10SF = String(grid.P10_DL_Speed_SF || (sfCat === '1st Priority Acquisition' ? '22.8 Mbps' : '14.5 Mbps'));

      const totalPoi = typeof grid.TOTAL_POI === 'number' ? grid.TOTAL_POI : (grid.poi || 0);
      const totalBts = typeof grid.TOTAL_BTS === 'number' ? grid.TOTAL_BTS : (grid.bts || 0);
      const totalBtsRes = typeof grid.TOTAL_BTS_RESIDENTIAL === 'number'
        ? grid.TOTAL_BTS_RESIDENTIAL
        : (parseInt(String(grid.TOTAL_BTS_RESIDENTIAL || '')) || Math.max(0, Math.floor(totalBts * 0.75)));

      const sitename = grid.sitename || `${kecamatan} Grid ${gridId.slice(-4)}`;

      // Synchronized Colors: using unified Category Theme
      // 1. 1st Priority Acquisition > Hijau (#10b981)
      // 2. 2nd Priority Acquisition > Orange (#f97316)
      // 3. 3rd Priority > Merah (#ef4444)
      // 4. Avoid Cannibalism > Abu (#64748b)
      const isDimmed = showHeatmap && dimGridPolygons;
      const fillColor = catTheme.hex;
      const strokeColor = catTheme.strokeHex;
      const fillOpacity = isDimmed
        ? 0.08
        : (sfCat === 'Avoid Cannibalism' ? 0.38 : sfCat === '1st Priority Acquisition' ? 0.45 : 0.48);
      const strokeOpacity = isDimmed ? 0.35 : 0.92;
      const strokeWidth = isDimmed ? 0.75 : 1.25;

      // Parse WKT polygon or GeoJSON geometry if available
      let wktPoints: [number, number][] | null = null;
      if (grid.geometry) {
        let geomObj: any = grid.geometry;
        if (typeof geomObj === 'string') {
          try {
            geomObj = JSON.parse(geomObj);
          } catch {}
        }
        if (geomObj && geomObj.type === 'Polygon' && Array.isArray(geomObj.coordinates?.[0])) {
          const coords = geomObj.coordinates[0];
          const pts = coords
            .map((c: any) => [c[1], c[0]] as [number, number])
            .filter(([lat, lng]: [number, number]) => !isNaN(lat) && !isNaN(lng));
          if (pts.length >= 3) wktPoints = pts;
        }
      }

      if (!wktPoints && wkt && typeof wkt === 'string') {
        const match = wkt.match(/POLYGON\s*\(\(\s*(.*?)\s*\)\)/i);
        if (match && match[1]) {
          const parsed = match[1].split(',').map((pair) => {
            const parts = pair.trim().split(/\s+/);
            const lng = parseFloat(parts[0]);
            const lat = parseFloat(parts[1]);
            return [lat, lng] as [number, number];
          }).filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
          if (parsed.length >= 3) wktPoints = parsed;
        }
      }

      const rect: L.Polygon = wktPoints
        ? L.polygon(wktPoints, {
            color: strokeColor,
            weight: strokeWidth,
            opacity: strokeOpacity,
            fillColor,
            fillOpacity,
            className: 'transition-all duration-150'
          })
        : L.rectangle(grid.bounds, {
            color: strokeColor,
            weight: strokeWidth,
            opacity: strokeOpacity,
            fillColor,
            fillOpacity,
            className: 'transition-all duration-150'
          });

      // Hover feedback
      rect.on('mouseover', function (this: L.Polygon) {
        this.setStyle({
          weight: 2.5,
          opacity: 1,
          color: '#ffffff',
          fillOpacity: isDimmed ? 0.45 : 0.70
        });
      });

      rect.on('mouseout', function (this: L.Polygon) {
        this.setStyle({
          weight: strokeWidth,
          opacity: strokeOpacity,
          color: strokeColor,
          fillOpacity
        });
      });

      // Computed traffic info for popup
      const trafficInfo = getGridTrafficIntensity(grid);

      // Simplified popup matching Gambar 1 + SF Fokus & Populasi
      const catBadgeColor = catTheme.hex;
      const catIcon = sfCat === '1st Priority Acquisition' ? '🎯'
        : sfCat === '2nd Priority Acquisition' ? '⚡'
        : sfCat === '3rd Priority' ? '⚠️'
        : '🛡️';

      const popupHtml = isDarkMode ? `
        <div class="space-y-2 text-slate-100 font-sans min-w-[250px] max-w-[300px] p-1">
          <div class="text-xs text-slate-300 space-y-1.5 leading-snug">
            <div class="flex items-center justify-between"><span class="text-blue-200/70">Grid ID:</span> <span class="font-mono text-white font-bold">${gridId}</span></div>
            <div class="font-extrabold text-blue-300 uppercase tracking-wide text-xs">${city.toUpperCase()}</div>
            <div class="flex items-center gap-1.5 pt-0.5">
              <span class="text-blue-200/70 text-[11px]">Prioritas:</span>
              <span
                style="background-color: ${catBadgeColor}; color: #ffffff;"
                class="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-xs whitespace-nowrap"
              >
                <span>${catIcon}</span>
                <span>${sfCat}</span>
              </span>
            </div>
            <div class="flex items-center justify-between"><span class="text-blue-200/70">SF Fokus:</span> <span class="font-semibold text-white">${promotor}</span></div>
            <div class="flex items-center justify-between"><span class="text-blue-200/70">Populasi:</span> <span class="font-mono font-semibold text-white">${population.toLocaleString('id-ID')} jiwa</span></div>
            <div class="flex items-center justify-between"><span class="text-blue-200/70">Total POI & BTS:</span> <span class="text-white font-mono font-medium">${totalPoi} POI &bull; ${totalBts} BTS</span></div>

            <div class="pt-1.5 border-t border-blue-900/60 text-[11px] space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-blue-200/70">MS XLCo:</span>
                <span class="font-mono font-semibold text-blue-400">${msXLCo}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-blue-200/70">MS SF:</span>
                <span class="font-mono font-bold text-emerald-400">${msSF}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-blue-200/70">MS IM3:</span>
                <span class="font-mono font-semibold text-amber-400">${msIM3}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-blue-200/70">MS 3TRI:</span>
                <span class="font-mono font-semibold text-indigo-300">${ms3TRI}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-blue-200/70">MS TSEL:</span>
                <span class="font-mono font-semibold text-rose-400">${msTSEL}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-blue-200/70">MS XLS:</span>
                <span class="font-mono font-semibold text-blue-300">${msXLS}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-blue-200/70">MS IOH:</span>
                <span class="font-mono font-semibold text-amber-300">${msIOH}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-blue-200/70">P10 Speed SF:</span>
                <span class="font-mono font-semibold text-emerald-300">${p10SF}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-blue-200/70">P10 Speed XLCo:</span>
                <span class="font-mono font-semibold text-blue-300">${p10XLCo}</span>
              </div>
            </div>
          </div>

          <div class="pt-2 flex items-center gap-2 border-t border-blue-900/60">
            <a
              href="https://www.google.com/maps/search/?api=1&query=${centerLat},${centerLng}"
              target="_blank"
              rel="noopener noreferrer"
              class="w-full inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition shadow-xs no-underline cursor-pointer"
            >
              <span>🧭</span>
              <span>Go to Location</span>
            </a>
            ${user?.role === 'ADMIN' ? `
              <button
                id="btn-edit-${gridId}"
                type="button"
                class="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-medium py-1.5 px-2.5 rounded-lg text-xs transition cursor-pointer shrink-0"
                title="Edit Grid Data"
              >
                <span>⚙️</span> Edit
              </button>
            ` : ''}
          </div>
        </div>
      ` : `
        <div class="space-y-2 text-slate-900 font-sans min-w-[250px] max-w-[300px] p-1">
          <div class="text-xs text-slate-600 space-y-1.5 leading-snug">
            <div class="flex items-center justify-between"><span class="text-slate-500 font-medium">Grid ID:</span> <span class="font-mono text-slate-900 font-bold">${gridId}</span></div>
            <div class="font-extrabold text-blue-900 uppercase tracking-wide text-xs">${city.toUpperCase()}</div>
            <div class="flex items-center gap-1.5 pt-0.5">
              <span class="text-slate-500 text-[11px] font-medium">Prioritas:</span>
              <span
                style="background-color: ${catBadgeColor}; color: #ffffff;"
                class="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-xs whitespace-nowrap"
              >
                <span>${catIcon}</span>
                <span>${sfCat}</span>
              </span>
            </div>
            <div class="flex items-center justify-between"><span class="text-slate-500 font-medium">SF Fokus:</span> <span class="font-semibold text-slate-900">${promotor}</span></div>
            <div class="flex items-center justify-between"><span class="text-slate-500 font-medium">Populasi:</span> <span class="font-mono font-semibold text-slate-900">${population.toLocaleString('id-ID')} jiwa</span></div>
            <div class="flex items-center justify-between"><span class="text-slate-500 font-medium">Total POI & BTS:</span> <span class="text-slate-800 font-mono font-semibold">${totalPoi} POI &bull; ${totalBts} BTS</span></div>

            <div class="pt-1.5 border-t border-slate-200 text-[11px] space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-slate-500 font-medium">MS XLCo:</span>
                <span class="font-mono font-bold text-blue-700">${msXLCo}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-500 font-medium">MS SF:</span>
                <span class="font-mono font-bold text-emerald-700">${msSF}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-500 font-medium">MS IM3:</span>
                <span class="font-mono font-bold text-amber-700">${msIM3}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-500 font-medium">MS 3TRI:</span>
                <span class="font-mono font-bold text-indigo-700">${ms3TRI}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-500 font-medium">MS TSEL:</span>
                <span class="font-mono font-bold text-rose-700">${msTSEL}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-500 font-medium">MS XLS:</span>
                <span class="font-mono font-bold text-blue-800">${msXLS}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-500 font-medium">MS IOH:</span>
                <span class="font-mono font-bold text-amber-800">${msIOH}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-500 font-medium">P10 Speed SF:</span>
                <span class="font-mono font-semibold text-emerald-800">${p10SF}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-500 font-medium">P10 Speed XLCo:</span>
                <span class="font-mono font-semibold text-blue-800">${p10XLCo}</span>
              </div>
            </div>
          </div>

          <div class="pt-2 flex items-center gap-2 border-t border-slate-200">
            <a
              href="https://www.google.com/maps/search/?api=1&query=${centerLat},${centerLng}"
              target="_blank"
              rel="noopener noreferrer"
              class="w-full inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition shadow-xs no-underline cursor-pointer"
            >
              <span>🧭</span>
              <span>Go to Location</span>
            </a>
            ${user?.role === 'ADMIN' ? `
              <button
                id="btn-edit-${gridId}"
                type="button"
                class="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-medium py-1.5 px-2.5 rounded-lg text-xs transition cursor-pointer shrink-0"
                title="Edit Grid Data"
              >
                <span>⚙️</span> Edit
              </button>
            ` : ''}
          </div>
        </div>
      `;

      rect.bindPopup(popupHtml, {
        className: isDarkMode ? 'dark-leaflet-popup' : 'light-leaflet-popup',
        maxWidth: 320,
        minWidth: 250
      });

      rect.on('popupopen', () => {
        // Edit button handler
        const btnEdit = document.getElementById(`btn-edit-${gridId}`);
        if (btnEdit && onEditGrid) {
          btnEdit.onclick = () => onEditGrid(grid);
        }
      });

      rect.on('click', () => {
        if (onSelectGrid) onSelectGrid(grid);
      });

      gridLayersRef.current?.addLayer(rect);
      boundsGroup.addLayer(rect);
    });

    // Auto fit bounds if filtered by region, city, or category
    if (grids.length > 0 && grids.length < 25000) {
      const b = boundsGroup.getBounds();
      if (b.isValid()) {
        mapInstanceRef.current.fitBounds(b, { padding: [25, 25], maxZoom: 13 });
      }
    }
  }, [grids, showHeatmap, dimGridPolygons, isDarkMode]);

  // Render BTS
  useEffect(() => {
    if (!btsLayersRef.current) return;
    btsLayersRef.current.clearLayers();

    if (selectedBtsRevs.length === 0) return;

    const visibleBts = btsList.filter((bts) => {
      const flag = bts['Revenue Flag'] || bts.rev || 'Unknown';
      return selectedBtsRevs.includes(flag);
    });

    const renderLimit = 2500;
    const btsToRender = visibleBts.length > renderLimit ? visibleBts.slice(0, renderLimit) : visibleBts;

    btsToRender.forEach((bts) => {
      const lat = bts.latitude ?? bts.lat ?? -7.054;
      const lng = bts.ongitude ?? bts.longitude ?? bts.lng ?? 112.742;
      const sitename = bts.sitename || bts.name || `Tower ${bts.id}`;
      const revFlag = bts['Revenue Flag'] || bts.rev || 'Rev >40 Mn';
      const siteType = bts.site_type || bts.type || 'Macro';
      const siteFunc = bts['Site Function'] || bts.func || 'Residential';
      const aging = bts['Aging (Month)'] ?? bts.aging_month ?? 24;
      const metaId = bts.GRID_META_ID || bts.grid || `GM-${bts.id}`;
      const bsp = bts['BSP Data'] || bts.bsp_data || 'Smartfren Fiber Core';
      const rawRev = bts['Rev.2026'] ?? bts.Rev_2026 ?? 45000000;
      const revFormatted = `Rp ${(Number(rawRev) / 1000000).toFixed(1)} Mn`;

      let markerColor = '#64748b';
      const found = BTS_REV_CONFIG.find((c) => c.key === revFlag);
      if (found) markerColor = found.color;

      // Custom Telecom Cell Tower Marker Pin using Leaflet divIcon (Static, lightweight & precise)
      const towerDivIcon = L.divIcon({
        html: generateTowerMarkerHtml(markerColor, sitename),
        className: 'custom-bts-tower-icon',
        iconSize: [28, 34],
        iconAnchor: [14, 34],
        popupAnchor: [0, -32]
      });

      const btsMarker = L.marker([lat, lng], {
        icon: towerDivIcon,
        title: sitename
      });

      const popupHtml = isDarkMode ? `
        <div class="p-3 space-y-2 text-slate-100 font-sans min-w-[260px] max-w-[310px]">
          <div class="flex items-center justify-between border-b border-blue-900/60 pb-1.5 gap-2">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="p-1 rounded-md bg-blue-500/20 text-cyan-300 shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="2" x2="12" y2="6" /><circle cx="12" cy="2.5" r="1.2" fill="currentColor" />
                  <line x1="8" y1="7" x2="16" y2="7" /><line x1="6.5" y1="12" x2="17.5" y2="12" />
                  <path d="M9.5 7L4.5 22" /><path d="M14.5 7L19.5 22" />
                  <line x1="8.5" y1="9.5" x2="15.5" y2="12" /><line x1="15.5" y1="9.5" x2="8.5" y2="12" />
                  <path d="M4.5 4A4 4 0 0 0 2 8" /><path d="M19.5 4A4 4 0 0 1 22 8" />
                </svg>
              </span>
              <span class="font-bold text-xs text-white truncate" title="${sitename}">${sitename}</span>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded font-bold text-white shadow-xs shrink-0" style="background-color: ${markerColor}">${revFlag}</span>
          </div>
          <div class="text-[11px] text-slate-300 space-y-1">
            <div class="flex items-center justify-between"><span class="text-blue-200/70">ID Tower:</span> <strong class="text-cyan-300 font-mono font-bold">${bts.id}</strong></div>
            <div class="flex items-start justify-between gap-2"><span class="text-blue-200/70 shrink-0">Wilayah:</span> <strong class="text-white text-right font-medium">${bts.City || bts.city || ''}, ${bts.Kecamatan || bts.kec || ''}</strong></div>
            <div class="flex items-center justify-between"><span class="text-blue-200/70">Tipe & Fungsi:</span> <strong class="text-slate-100 font-medium">${siteType} &bull; ${siteFunc}</strong></div>
            <div class="flex items-center justify-between"><span class="text-blue-200/70">Aging:</span> <strong class="text-amber-300 font-mono font-bold">${aging} Bulan</strong></div>
            <div class="flex items-center justify-between"><span class="text-blue-200/70">GRID_META_ID:</span> <span class="font-mono text-amber-300 font-semibold">${metaId}</span></div>
          </div>
          <div class="pt-2 flex flex-col gap-1.5 border-t border-blue-900/60">
            <a
              href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}"
              target="_blank"
              rel="noopener noreferrer"
              class="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs py-1.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 text-center no-underline font-semibold shadow-xs"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
              <span>Go to Location (Google Maps)</span>
            </a>
            ${user?.role === 'ADMIN' ? `
              <button id="btn-edit-bts-${bts.id}" class="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs py-1.5 rounded-lg transition cursor-pointer font-medium flex items-center justify-center gap-1">
                <span>⚙️</span> Edit Data BTS (16 Fields Master)
              </button>
            ` : ''}
          </div>
        </div>
      ` : `
        <div class="p-3 space-y-2 text-slate-900 font-sans min-w-[260px] max-w-[310px]">
          <div class="flex items-center justify-between border-b border-slate-200 pb-1.5 gap-2">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="p-1 rounded-md bg-blue-50 text-blue-700 shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="2" x2="12" y2="6" /><circle cx="12" cy="2.5" r="1.2" fill="currentColor" />
                  <line x1="8" y1="7" x2="16" y2="7" /><line x1="6.5" y1="12" x2="17.5" y2="12" />
                  <path d="M9.5 7L4.5 22" /><path d="M14.5 7L19.5 22" />
                  <line x1="8.5" y1="9.5" x2="15.5" y2="12" /><line x1="15.5" y1="9.5" x2="8.5" y2="12" />
                  <path d="M4.5 4A4 4 0 0 0 2 8" /><path d="M19.5 4A4 4 0 0 1 22 8" />
                </svg>
              </span>
              <span class="font-bold text-xs text-slate-900 truncate" title="${sitename}">${sitename}</span>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded font-bold text-white shadow-xs shrink-0" style="background-color: ${markerColor}">${revFlag}</span>
          </div>
          <div class="text-[11px] text-slate-600 space-y-1">
            <div class="flex items-center justify-between"><span class="text-slate-500 font-medium">ID Tower:</span> <strong class="text-blue-700 font-mono font-bold">${bts.id}</strong></div>
            <div class="flex items-start justify-between gap-2"><span class="text-slate-500 font-medium shrink-0">Wilayah:</span> <strong class="text-slate-800 text-right font-semibold">${bts.City || bts.city || ''}, ${bts.Kecamatan || bts.kec || ''}</strong></div>
            <div class="flex items-center justify-between"><span class="text-slate-500 font-medium">Tipe & Fungsi:</span> <strong class="text-slate-800 font-medium">${siteType} &bull; ${siteFunc}</strong></div>
            <div class="flex items-center justify-between"><span class="text-slate-500 font-medium">Aging:</span> <strong class="text-amber-800 font-mono font-bold">${aging} Bulan</strong></div>
            <div class="flex items-center justify-between"><span class="text-slate-500 font-medium">GRID_META_ID:</span> <span class="font-mono text-indigo-700 font-bold">${metaId}</span></div>
          </div>
          <div class="pt-2 flex flex-col gap-1.5 border-t border-slate-200">
            <a
              href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}"
              target="_blank"
              rel="noopener noreferrer"
              class="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 text-center no-underline font-semibold shadow-xs"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
              <span>Go to Location (Google Maps)</span>
            </a>
            ${user?.role === 'ADMIN' ? `
              <button id="btn-edit-bts-${bts.id}" class="w-full bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs py-1.5 rounded-lg transition cursor-pointer font-medium flex items-center justify-center gap-1">
                <span>⚙️</span> Edit Data BTS (16 Fields Master)
              </button>
            ` : ''}
          </div>
        </div>
      `;

      btsMarker.bindPopup(popupHtml, {
        className: isDarkMode ? 'dark-leaflet-popup' : 'light-leaflet-popup',
        minWidth: 260,
        maxWidth: 320
      });

      btsMarker.on('popupopen', () => {
        const btn = document.getElementById(`btn-edit-bts-${bts.id}`);
        if (btn && onEditBTS) {
          btn.onclick = () => onEditBTS(bts);
        }
      });

      btsLayersRef.current?.addLayer(btsMarker);
    });
  }, [btsList, selectedBtsRevs, isDarkMode]);

  // Render POIs
  useEffect(() => {
    if (!poiLayersRef.current) return;
    poiLayersRef.current.clearLayers();

    if (selectedPoiTypes.length === 0) return;

    const visiblePois = pois.filter((poi) => selectedPoiTypes.includes(poi.type));

    visiblePois.forEach((poi) => {
      const poiMarker = L.circleMarker([poi.lat, poi.lng], {
        radius: 4.5,
        fillColor: '#06b6d4',
        color: '#ffffff',
        weight: 1,
        fillOpacity: 0.85
      });

      const poiPopupHtml = isDarkMode ? `
        <div class="p-3 text-slate-100 font-sans text-xs min-w-[210px] max-w-[270px] space-y-2">
          <div>
            <div class="font-bold text-cyan-300 flex items-center gap-1.5 text-xs">
              <span class="text-sm shrink-0">${getPoiCategoryIcon(poi.type)}</span>
              <span class="truncate" title="${poi.name}">${poi.name}</span>
            </div>
            <div class="text-[11px] text-blue-200/80 font-medium mt-0.5">${poi.type}</div>
            <div class="text-[10px] text-slate-400 mt-1 border-t border-blue-900/50 pt-1">${poi.city}, ${poi.kec}</div>
          </div>
          <div class="pt-1.5 border-t border-blue-900/60">
            <a
              href="https://www.google.com/maps/search/?api=1&query=${poi.lat},${poi.lng}"
              target="_blank"
              rel="noopener noreferrer"
              class="w-full bg-blue-600 hover:bg-blue-500 text-white text-[11px] py-1.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 text-center no-underline font-semibold shadow-xs"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
              <span>Go to Location (Google Maps)</span>
            </a>
          </div>
        </div>
      ` : `
        <div class="p-3 text-slate-900 font-sans text-xs min-w-[210px] max-w-[270px] space-y-2">
          <div>
            <div class="font-bold text-blue-700 flex items-center gap-1.5 text-xs">
              <span class="text-sm shrink-0">${getPoiCategoryIcon(poi.type)}</span>
              <span class="truncate" title="${poi.name}">${poi.name}</span>
            </div>
            <div class="text-[11px] text-slate-700 font-medium mt-0.5">${poi.type}</div>
            <div class="text-[10px] text-slate-500 mt-1 border-t border-slate-200 pt-1">${poi.city}, ${poi.kec}</div>
          </div>
          <div class="pt-1.5 border-t border-slate-200">
            <a
              href="https://www.google.com/maps/search/?api=1&query=${poi.lat},${poi.lng}"
              target="_blank"
              rel="noopener noreferrer"
              class="w-full bg-blue-600 hover:bg-blue-700 text-white text-[11px] py-1.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5 text-center no-underline font-semibold shadow-xs"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
              <span>Go to Location (Google Maps)</span>
            </a>
          </div>
        </div>
      `;

      poiMarker.bindPopup(poiPopupHtml, {
        className: isDarkMode ? 'dark-leaflet-popup' : 'light-leaflet-popup',
        maxWidth: 260
      });

      poiLayersRef.current?.addLayer(poiMarker);
    });
  }, [pois, selectedPoiTypes, isDarkMode]);

  // Counts for display in buttons
  const visiblePoiCount = pois.filter((p) => selectedPoiTypes.includes(p.type)).length;
  const visibleBtsCount = btsList.filter((b) => selectedBtsRevs.includes(b.rev || 'Unknown')).length;

  return (
    <div
      className={`relative w-full h-[540px] sm:h-[600px] lg:h-[640px] ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      } rounded-2xl border shadow-2xl flex flex-col`}
    >
      {/* Stacked Top Header Controls */}
      <div
        className={`${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
        } rounded-t-2xl border-b px-3 sm:px-4 py-2.5 z-[1001] flex flex-wrap items-center justify-between gap-2 shrink-0 select-none shadow-sm relative`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {/* POI Dropdown Filter Button */}
          <div className="relative">
            <button
              onClick={() => {
                setShowPoiDropdown(!showPoiDropdown);
                setShowBtsDropdown(false);
                setShowHeatmapSettings(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border cursor-pointer ${
                visiblePoiCount > 0
                  ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                  : isDarkMode
                  ? 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>POI ({visiblePoiCount})</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPoiDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* POI Dropdown Modal Panel */}
            {showPoiDropdown && (
              <>
                <div
                  className="fixed inset-0 z-[1002] bg-black/20"
                  onClick={() => setShowPoiDropdown(false)}
                />
                <div
                  className={`absolute top-full left-0 mt-2 w-72 max-h-[380px] ${
                    isDarkMode ? 'bg-slate-900/98 border-slate-700/80 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-2xl'
                  } backdrop-blur-md border rounded-2xl p-3 shadow-2xl z-[1003] flex flex-col gap-2.5`}
                >
                  <div className="relative">
                    <Search className={`w-3.5 h-3.5 absolute left-2.5 top-2.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                    <input
                      type="text"
                      placeholder="Cari kategori POI..."
                      value={poiFilterSearch}
                      onChange={(e) => setPoiFilterSearch(e.target.value)}
                      className={`w-full rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 border ${
                        isDarkMode
                          ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                          : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>

                  {/* List of categories */}
                  <div className="overflow-y-auto max-h-52 space-y-1 pr-1 custom-scrollbar">
                    {allPoiTypes
                      .filter((type) => type.toLowerCase().includes(poiFilterSearch.toLowerCase()))
                      .map((type) => {
                        const count = pois.filter((p) => p.type === type).length;
                        const percent = pois.length > 0 ? ((count / pois.length) * 100).toFixed(1) : '0.0';
                        const isChecked = selectedPoiTypes.includes(type);

                        return (
                          <label
                            key={type}
                            className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition select-none ${
                              isDarkMode ? 'hover:bg-slate-800/60' : 'hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedPoiTypes(selectedPoiTypes.filter((t) => t !== type));
                                  } else {
                                    setSelectedPoiTypes([...selectedPoiTypes, type]);
                                  }
                                }}
                                className="rounded border-slate-400 text-blue-500 focus:ring-0 cursor-pointer"
                              />
                              <span className="text-sm shrink-0">{getPoiCategoryIcon(type)}</span>
                              <span className={`text-xs truncate font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                {type}
                              </span>
                            </div>
                            <span className={`text-[11px] font-mono shrink-0 ml-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600 font-semibold'}`}>
                              {count} ({percent}%)
                            </span>
                          </label>
                        );
                      })}
                  </div>

                  {/* Bottom Actions: Semua & Tidak Ada */}
                  <div className={`flex items-center gap-2 pt-2 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                    <button
                      type="button"
                      onClick={() => setSelectedPoiTypes(allPoiTypes)}
                      className={`flex-1 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                        isDarkMode
                          ? 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200'
                          : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                      }`}
                    >
                      Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPoiTypes([])}
                      className={`flex-1 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                        isDarkMode
                          ? 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200'
                          : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                      }`}
                    >
                      Tidak Ada
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* BTS/Tower Dropdown Filter Button */}
          <div className="relative">
            <button
              onClick={() => {
                setShowBtsDropdown(!showBtsDropdown);
                setShowPoiDropdown(false);
                setShowHeatmapSettings(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border cursor-pointer ${
                visibleBtsCount > 0
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                  : isDarkMode
                  ? 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <TowerIcon size={14} className="text-emerald-300" />
              <span>BTS / Tower ({visibleBtsCount})</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showBtsDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* BTS Dropdown Modal Panel */}
            {showBtsDropdown && (
              <>
                <div
                  className="fixed inset-0 z-[1002] bg-black/20"
                  onClick={() => setShowBtsDropdown(false)}
                />
                <div
                  className={`absolute top-full left-0 mt-2 w-72 ${
                    isDarkMode ? 'bg-slate-900/98 border-slate-700/80 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-2xl'
                  } backdrop-blur-md border rounded-2xl p-3 shadow-2xl z-[1003] flex flex-col gap-2.5`}
                >
                  {/* Dropdown Header with Tower Icon */}
                  <div className={`flex items-center gap-2 border-b pb-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                      <TowerIcon size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold">Layer Menara BTS / Tower</div>
                      <div className="text-[10px] text-slate-400">Filter berdasarkan status Revenue Flag</div>
                    </div>
                  </div>

                  <div className="space-y-1 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                    {BTS_REV_CONFIG.map((cfg) => {
                      const count = btsList.filter((b) => (b.rev || 'Unknown') === cfg.key).length;
                      const percent = btsList.length > 0 ? ((count / btsList.length) * 100).toFixed(1) : '0.0';
                      const isChecked = selectedBtsRevs.includes(cfg.key);

                      return (
                        <label
                          key={cfg.key}
                          className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition select-none ${
                            isDarkMode ? 'hover:bg-slate-800/60' : 'hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedBtsRevs(selectedBtsRevs.filter((k) => k !== cfg.key));
                                } else {
                                  setSelectedBtsRevs([...selectedBtsRevs, cfg.key]);
                                }
                              }}
                              className="rounded border-slate-400 text-blue-500 focus:ring-0 cursor-pointer"
                            />
                            <span
                              className="w-3.5 h-3.5 rounded-xs shrink-0 shadow-xs flex items-center justify-center text-[9px] text-white font-bold"
                              style={{ backgroundColor: cfg.color }}
                            >
                              <TowerIcon size={10} color="#fff" />
                            </span>
                            <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{cfg.label}</span>
                          </div>
                          <span className={`text-[11px] font-mono shrink-0 ml-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600 font-semibold'}`}>
                            {count} ({percent}%)
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Bottom Actions: Semua & Tidak Ada */}
                  <div className={`flex items-center gap-2 pt-2 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                    <button
                      type="button"
                      onClick={() => setSelectedBtsRevs(BTS_REV_CONFIG.map((c) => c.key))}
                      className={`flex-1 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                        isDarkMode
                          ? 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200'
                          : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                      }`}
                    >
                      Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedBtsRevs([])}
                      className={`flex-1 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                        isDarkMode
                          ? 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200'
                          : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                      }`}
                    >
                      Tidak Ada
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* VISUALIZATION LAYER: Heatmap Overlay Toggle & Settings */}
          <div className="relative">
            <button
              onClick={() => {
                setShowHeatmapSettings(!showHeatmapSettings);
                setShowPoiDropdown(false);
                setShowBtsDropdown(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border cursor-pointer select-none ${
                showHeatmap
                  ? 'bg-gradient-to-r from-amber-600 via-rose-600 to-red-600 text-white border-amber-400 shadow-md shadow-amber-500/25'
                  : isDarkMode
                  ? 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
              title="Toggle & Konfigurasi Heatmap Visualisasi"
            >
              <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'text-yellow-200 animate-pulse' : 'text-amber-400'}`} />
              <span>
                {showHeatmap
                  ? heatmapMetric === 'revenue'
                    ? 'Heatmap: Revenue'
                    : heatmapMetric === 'traffic'
                    ? 'Heatmap: Trafik'
                    : 'Heatmap: Prioritas'
                  : 'Heatmap Overlay'}
              </span>
              {showHeatmap ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              ) : (
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ml-0.5 ${
                  isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                }`}>
                  OFF
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHeatmapSettings ? 'rotate-180' : ''}`} />
            </button>

            {/* Heatmap Settings & Metric Configuration Dropdown Panel */}
            {showHeatmapSettings && (
              <>
                <div
                  className="fixed inset-0 z-[1002] bg-black/20"
                  onClick={() => setShowHeatmapSettings(false)}
                />
                <div
                  className={`absolute top-full left-0 mt-2 w-80 sm:w-88 ${
                    isDarkMode ? 'bg-slate-900/98 border-slate-700/80 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-2xl'
                  } backdrop-blur-md border rounded-2xl p-4 shadow-2xl z-[1003] flex flex-col gap-3.5`}
                >
                  {/* Header with Title & Master Toggle */}
                  <div className={`flex items-center justify-between border-b pb-2.5 ${isDarkMode ? 'border-slate-700/70' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <Flame className="w-4 h-4" />
                      </div>
                      <div>
                        <div className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Visualisasi Heatmap</div>
                        <div className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Potensi Revenue & Densitas Trafik</div>
                      </div>
                    </div>
                    {/* Master Switch */}
                    <button
                      type="button"
                      onClick={() => setShowHeatmap(!showHeatmap)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        showHeatmap ? 'bg-rose-600' : isDarkMode ? 'bg-slate-700' : 'bg-slate-300'
                      }`}
                      role="switch"
                      aria-checked={showHeatmap}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          showHeatmap ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Metric Switcher Cards */}
                  <div className="space-y-1.5">
                    <div className={`text-[11px] font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      Pilih Metrik Visualisasi:
                    </div>

                    {/* Mode 1: Potential Revenue */}
                    <button
                      type="button"
                      onClick={() => {
                        setHeatmapMetric('revenue');
                        if (!showHeatmap) setShowHeatmap(true);
                      }}
                      className={`w-full p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                        heatmapMetric === 'revenue' && showHeatmap
                          ? isDarkMode
                            ? 'bg-rose-500/15 border-rose-500/50 text-white shadow-sm'
                            : 'bg-rose-50 border-rose-400 text-rose-950 shadow-xs'
                          : isDarkMode
                          ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${
                          heatmapMetric === 'revenue' && showHeatmap
                            ? 'bg-rose-500 text-white'
                            : isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Potensi Revenue (Rev 2026)</span>
                          {heatmapMetric === 'revenue' && showHeatmap && (
                            <span className="text-[10px] text-rose-500 font-bold">Aktif</span>
                          )}
                        </div>
                        <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Berdasarkan Rev August 2026 (<span className={isDarkMode ? 'text-blue-300' : 'text-blue-700'}>&lt;20Mn</span> s/d{' '}
                          <span className="text-rose-500 font-semibold">&gt;40Mn</span>).
                        </p>
                      </div>
                    </button>

                    {/* Mode 2: Traffic Density */}
                    <button
                      type="button"
                      onClick={() => {
                        setHeatmapMetric('traffic');
                        if (!showHeatmap) setShowHeatmap(true);
                      }}
                      className={`w-full p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                        heatmapMetric === 'traffic' && showHeatmap
                          ? isDarkMode
                            ? 'bg-cyan-500/15 border-cyan-500/50 text-white shadow-sm'
                            : 'bg-cyan-50 border-cyan-400 text-cyan-950 shadow-xs'
                          : isDarkMode
                          ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${
                          heatmapMetric === 'traffic' && showHeatmap
                            ? 'bg-cyan-500 text-white'
                            : isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        <Activity className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Kepadatan Trafik & Aktivitas</span>
                          {heatmapMetric === 'traffic' && showHeatmap && (
                            <span className="text-[10px] text-cyan-500 font-bold">Aktif</span>
                          )}
                        </div>
                        <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Kombinasi populasi grid, konsentrasi POI publik, dan status beban site (High Load).
                        </p>
                      </div>
                    </button>

                    {/* Mode 3: Priority Acquisition */}
                    <button
                      type="button"
                      onClick={() => {
                        setHeatmapMetric('priority');
                        if (!showHeatmap) setShowHeatmap(true);
                      }}
                      className={`w-full p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                        heatmapMetric === 'priority' && showHeatmap
                          ? isDarkMode
                            ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-sm'
                            : 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-xs'
                          : isDarkMode
                          ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${
                          heatmapMetric === 'priority' && showHeatmap
                            ? 'bg-emerald-500 text-white'
                            : isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Prioritas Akuisisi (P1/P2/P3)</span>
                          {heatmapMetric === 'priority' && showHeatmap && (
                            <span className="text-[10px] text-emerald-500 font-bold">Aktif</span>
                          )}
                        </div>
                        <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Klaster prioritas ekspansi pasar vs area proteksi kanibalisasi.
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Visual Tuning Sliders */}
                  <div className={`space-y-2.5 pt-2 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1 ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        <Sliders className="w-3 h-3" /> Parameter Layer:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setHeatmapRadius(36);
                          setHeatmapBlur(22);
                          setHeatmapMinOpacity(0.32);
                        }}
                        className={`text-[10px] flex items-center gap-1 cursor-pointer transition ${
                          isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900 font-semibold'
                        }`}
                        title="Reset ke parameter default"
                      >
                        <RotateCcw className="w-3 h-3" /> Default
                      </button>
                    </div>

                    {/* Radius Slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700 font-medium'}>Radius Titik Panas:</span>
                        <span className={`font-mono font-bold text-[11px] ${isDarkMode ? 'text-amber-300' : 'text-amber-800'}`}>{heatmapRadius} px</span>
                      </div>
                      <input
                        type="range"
                        min="16"
                        max="64"
                        step="2"
                        value={heatmapRadius}
                        onChange={(e) => setHeatmapRadius(Number(e.target.value))}
                        className={`w-full accent-amber-500 cursor-pointer h-1.5 rounded-lg ${
                          isDarkMode ? 'bg-slate-800' : 'bg-slate-200'
                        }`}
                      />
                    </div>

                    {/* Blur Slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700 font-medium'}>Tingkat Blur / Difusi:</span>
                        <span className={`font-mono font-bold text-[11px] ${isDarkMode ? 'text-amber-300' : 'text-amber-800'}`}>{heatmapBlur} px</span>
                      </div>
                      <input
                        type="range"
                        min="8"
                        max="40"
                        step="2"
                        value={heatmapBlur}
                        onChange={(e) => setHeatmapBlur(Number(e.target.value))}
                        className={`w-full accent-amber-500 cursor-pointer h-1.5 rounded-lg ${
                          isDarkMode ? 'bg-slate-800' : 'bg-slate-200'
                        }`}
                      />
                    </div>

                    {/* Polygon Dimmer Checkbox */}
                    <label className="flex items-center justify-between pt-1 cursor-pointer select-none">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={dimGridPolygons}
                          onChange={(e) => setDimGridPolygons(e.target.checked)}
                          className="rounded border-slate-400 text-rose-500 focus:ring-0 cursor-pointer"
                        />
                        <span className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-800 font-medium'}`}>Redupkan poligon saat aktif</span>
                      </div>
                      <span className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Glow lebih tajam</span>
                    </label>
                  </div>

                  {/* Quick Bottom Actions */}
                  <div className={`flex items-center gap-2 pt-2 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                    <button
                      type="button"
                      onClick={() => setShowHeatmap(!showHeatmap)}
                      className={`flex-1 py-1.5 rounded-xl font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        showHeatmap
                          ? isDarkMode
                            ? 'bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300'
                          : 'bg-rose-600 hover:bg-rose-500 text-white'
                      }`}
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>{showHeatmap ? 'Nonaktifkan Heatmap' : 'Nyalakan Heatmap'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowHeatmapSettings(false)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                        isDarkMode
                          ? 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300'
                          : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                      }`}
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Base Map Switcher: Light / Dark / Satelit */}
          <div
            className={`${
              isDarkMode ? 'bg-slate-950 border-slate-700' : 'bg-slate-200 border-slate-300'
            } border rounded-lg p-0.5 flex items-center gap-0.5 shadow-sm`}
          >
            <button
              onClick={() => setMapTheme('osm')}
              className={`px-2.5 py-1 text-[11px] rounded-md font-semibold transition cursor-pointer ${
                mapTheme === 'osm'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Light
            </button>
            <button
              onClick={() => setMapTheme('dark')}
              className={`px-2.5 py-1 text-[11px] rounded-md font-semibold transition cursor-pointer ${
                mapTheme === 'dark'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dark
            </button>
            <button
              onClick={() => setMapTheme('satellite')}
              className={`px-2.5 py-1 text-[11px] rounded-md font-semibold transition cursor-pointer ${
                mapTheme === 'satellite'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Satelit
            </button>
          </div>
        </div>

        {/* Stacked Map Zoom Controls in Toolbar */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className={`w-7 h-7 ${
              isDarkMode
                ? 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-white'
                : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
            } border rounded-lg flex items-center justify-center text-xs font-bold transition shadow-xs cursor-pointer`}
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className={`w-7 h-7 ${
              isDarkMode
                ? 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-white'
                : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
            } border rounded-lg flex items-center justify-center text-xs font-bold transition shadow-xs cursor-pointer`}
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Map DOM Element Canvas */}
      <div className="relative flex-1 w-full h-full min-h-0 overflow-hidden rounded-b-2xl z-0">
        <div ref={mapContainerRef} className="w-full h-full" id="map-canvas" />

        {/* FLOATING HEATMAP LEGEND OVERLAY (visible when showHeatmap is TRUE) */}
        {showHeatmap && (
          <div
            className={`absolute bottom-12 sm:bottom-3 right-3 z-[900] ${
              isDarkMode
                ? 'bg-slate-950/92 border-slate-800 text-white'
                : 'bg-white/95 border-slate-300 text-slate-900'
            } backdrop-blur-md border rounded-xl p-2.5 sm:p-3 shadow-2xl transition-all max-w-[290px] sm:max-w-[330px]`}
          >
            {/* Legend Header */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-1.5 mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                <span className="text-xs font-bold truncate">
                  {heatmapMetric === 'revenue'
                    ? 'Heatmap: Potensi Revenue'
                    : heatmapMetric === 'traffic'
                    ? 'Heatmap: Kepadatan Trafik'
                    : 'Heatmap: Prioritas Akuisisi'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {/* Metric Quick Switch Pill */}
                <button
                  type="button"
                  onClick={() =>
                    setHeatmapMetric((prev) =>
                      prev === 'revenue' ? 'traffic' : prev === 'traffic' ? 'priority' : 'revenue'
                    )
                  }
                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 cursor-pointer transition"
                  title="Ganti metrik visualisasi"
                >
                  Ganti Metrik
                </button>
                <button
                  type="button"
                  onClick={() => setIsLegendCollapsed(!isLegendCollapsed)}
                  className={`p-1 rounded cursor-pointer ${
                    isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title={isLegendCollapsed ? 'Perluas legenda' : 'Kecilkan legenda'}
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isLegendCollapsed ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {!isLegendCollapsed && (
              <>
                {/* Visual Gradient Color Bar */}
                <div className="space-y-1 mb-2">
                  <div
                    className="w-full h-3 rounded-md shadow-inner"
                    style={{
                      background:
                        heatmapMetric === 'revenue'
                          ? 'linear-gradient(to right, #3b82f6 0%, #06b6d4 25%, #10b981 50%, #f59e0b 75%, #ef4444 100%)'
                          : heatmapMetric === 'traffic'
                          ? 'linear-gradient(to right, #0284c7 0%, #14b8a6 25%, #eab308 50%, #f97316 75%, #dc2626 100%)'
                          : 'linear-gradient(to right, #475569 0%, #ef4444 35%, #f97316 70%, #10b981 100%)'
                    }}
                  />
                  {/* Legend Labels under color bar */}
                  <div className={`flex items-center justify-between text-[10px] font-mono ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600 font-semibold'
                  }`}>
                    {heatmapMetric === 'revenue' ? (
                      <>
                        <span>&lt;20 Jt</span>
                        <span>25 Jt</span>
                        <span>35 Jt</span>
                        <span className={isDarkMode ? 'text-rose-400 font-bold' : 'text-rose-600 font-bold'}>&gt;40 Jt</span>
                      </>
                    ) : heatmapMetric === 'traffic' ? (
                      <>
                        <span>Rendah</span>
                        <span>Sedang</span>
                        <span>Padat</span>
                        <span className={isDarkMode ? 'text-rose-400 font-bold' : 'text-rose-600 font-bold'}>Hotspot</span>
                      </>
                    ) : (
                      <>
                        <span>Avoid</span>
                        <span>P3</span>
                        <span>P2</span>
                        <span className={isDarkMode ? 'text-emerald-400 font-bold' : 'text-emerald-700 font-bold'}>P1 Akuisisi</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Subtitle / Insight description */}
                <div className={`text-[10px] border-t pt-1.5 flex items-center justify-between ${
                  isDarkMode ? 'text-slate-400 border-slate-800/80' : 'text-slate-600 border-slate-200'
                }`}>
                  <span>
                    {heatmapMetric === 'revenue'
                      ? 'Distribusi pendapatan grid Aug 2026'
                      : heatmapMetric === 'traffic'
                      ? 'Beban data seluler & konsentrasi POI'
                      : 'Prioritas ekspansi vs kanibalisasi'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowHeatmapSettings(true)}
                    className={`${isDarkMode ? 'text-amber-400 hover:text-amber-300' : 'text-amber-700 hover:text-amber-800 font-bold'} hover:underline cursor-pointer ml-1`}
                  >
                    Atur
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* FLOATING MAP LEGEND: Tabbed Grid Categories & BTS Tower (visible when showHeatmap is FALSE) */}
        {!showHeatmap && (
          <div
            className={`absolute bottom-12 sm:bottom-3 right-3 z-[900] ${
              isDarkMode
                ? 'bg-slate-950/92 border-slate-800 text-white'
                : 'bg-white/95 border-slate-300 text-slate-900 shadow-xl'
            } backdrop-blur-md border rounded-xl p-2.5 sm:p-3 shadow-2xl transition-all max-w-[290px] sm:max-w-[340px]`}
          >
            {/* Header with Switcher Tabs */}
            <div className={`flex items-center justify-between gap-2 border-b pb-1.5 mb-2 ${
              isDarkMode ? 'border-slate-700/60' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setLegendTab('grid')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                    legendTab === 'grid'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isDarkMode
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <GridPolygonIcon size={12} />
                  <span>Grid (SF)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLegendTab('bts')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                    legendTab === 'bts'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isDarkMode
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TowerIcon size={12} />
                  <span>Menara BTS</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsLegendCollapsed(!isLegendCollapsed)}
                className={`p-1 rounded cursor-pointer ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                title={isLegendCollapsed ? 'Perluas legenda' : 'Kecilkan legenda'}
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isLegendCollapsed ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {!isLegendCollapsed && legendTab === 'grid' && (
              <div className="space-y-1.5 text-xs">
                {Object.values(CATEGORY_THEMES).map((theme) => {
                  const count = grids.filter(
                    (g) => (g['SF Grid Category'] || g.SF_Grid_Category || g.cat) === theme.category
                  ).length;
                  return (
                    <div
                      key={theme.category}
                      className={`flex items-center justify-between text-[11px] p-1 rounded-md transition ${
                        isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3.5 h-3.5 rounded-xs shrink-0 shadow-xs border border-white/30"
                          style={{ backgroundColor: theme.hex }}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className={`font-bold truncate text-[11px] ${
                            isDarkMode ? 'text-slate-100' : 'text-slate-900'
                          }`}>
                            {theme.category}
                          </span>
                          <span className="text-[10px] font-semibold" style={{ color: theme.hex }}>
                            {theme.shortLabel}
                          </span>
                        </div>
                      </div>
                      <span className={`font-mono font-bold text-[11px] ml-2 shrink-0 px-1.5 py-0.5 rounded border ${
                        isDarkMode
                          ? 'text-slate-300 bg-slate-800/80 border-slate-700/60'
                          : 'text-slate-800 bg-slate-100 border-slate-300'
                      }`}>
                        {count.toLocaleString('id-ID')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {!isLegendCollapsed && legendTab === 'bts' && (
              <div className="space-y-1.5 text-xs">
                {BTS_REV_CONFIG.map((cfg) => {
                  const count = btsList.filter((b) => (b['Revenue Flag'] || b.rev || 'Unknown') === cfg.key).length;
                  return (
                    <div
                      key={cfg.key}
                      className={`flex items-center justify-between text-[11px] p-1 rounded-md transition ${
                        isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-5 h-5 rounded-full border border-white flex items-center justify-center shrink-0 shadow-sm"
                          style={{ backgroundColor: cfg.color }}
                        >
                          <TowerIcon size={11} color="#ffffff" />
                        </div>
                        <span className={`font-bold truncate text-[11px] ${
                          isDarkMode ? 'text-slate-100' : 'text-slate-900'
                        }`}>
                          {cfg.label}
                        </span>
                      </div>
                      <span className={`font-mono font-bold text-[11px] ml-2 shrink-0 px-1.5 py-0.5 rounded border ${
                        isDarkMode
                          ? 'text-slate-300 bg-slate-800/80 border-slate-700/60'
                          : 'text-slate-800 bg-slate-100 border-slate-300'
                      }`}>
                        {count.toLocaleString('id-ID')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer Caption Overlay */}
        <div
          className={`absolute bottom-2 left-3 right-3 sm:right-auto z-[900] ${
            isDarkMode ? 'bg-slate-950/90 border-slate-800 text-slate-400' : 'bg-white/90 border-slate-200 text-slate-600'
          } border rounded-lg px-3 py-1.5 text-[11px] shadow-xl backdrop-blur-sm pointer-events-none flex items-center gap-2`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          <span>Klik poligon Grid atau marker BTS / POI untuk analisis akuisisi & penetrasi pasar.</span>
        </div>
      </div>
    </div>
  );
};

