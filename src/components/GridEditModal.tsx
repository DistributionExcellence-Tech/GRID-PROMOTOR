import React, { useState, useEffect } from 'react';
import { X, Save, Layers, Sparkles, RefreshCw } from 'lucide-react';
import type { GridItem, GridCategory, RevenueFlag } from '../types';
import { deriveGridTelecomMetrics, formatMSAbsolute } from '../utils/telecomMetrics';

interface GridEditModalProps {
  isOpen: boolean;
  grid: GridItem | null;
  onClose: () => void;
  onSave: (grid: GridItem) => Promise<void>;
}

export const GridEditModal: React.FC<GridEditModalProps> = ({
  isOpen,
  grid,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<Partial<GridItem>>({
    GRID_ID: '',
    REGION: 'EAST JAVA',
    PROVINCE: 'JAWA TIMUR (4672)',
    CITY: 'KAB. BANGKALAN',
    KECAMATAN: 'Bangkalan',
    'SF Grid Category': '1st Priority Acquisition',
    'Mapping Promotor': 'MULTIBRAND',
    'Center Long': 112.915,
    'Center Lat': -7.045,
    'Geometry WKT': '',
    POPULATION: 8500,
    'MS_XLCo.': '28.5',
    MS_SF: '18.4',
    MS_IM3: '14.1',
    MS_3TRI: '8.5',
    MS_TSEL: '35.2',
    MS_XLS: '16.8',
    MS_IOH: '22.6',
    P10_DL_Speed_XLCo: '16.4 Mbps',
    P10_DL_Speed_SF: '22.8 Mbps',
    TOTAL_POI: 12,
    TOTAL_BTS: 2,
    TOTAL_BTS_RESIDENTIAL: 2,

    id: '',
    sitename: '',
    site_type: 'Macro',
    Province: 'JAWA TIMUR (4672)',
    City: 'KAB. BANGKALAN',
    Kecamatan: 'Bangkalan',
    Region: 'EAST JAVA',
    latitude: -7.045,
    longitude: 112.915,
    GRID_META_ID: '',
    Rev_August_2026: 42000000,
    Revenue_Flag: 'Rev >40 Mn',
    SF_Grid_Category: '1st Priority Acquisition',
    Geometry_WKT: '',
    Device_Status: 'Active'
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (grid) {
      const lat = typeof grid['Center Lat'] === 'number'
        ? grid['Center Lat']
        : (grid.latitude !== undefined ? grid.latitude : grid.center?.[0] ?? -7.045);
      const lng = typeof grid['Center Long'] === 'number'
        ? grid['Center Long']
        : (grid.longitude !== undefined ? grid.longitude : grid.center?.[1] ?? 112.915);
      const step = 0.022;
      const defaultWkt = `POLYGON ((${Number((lng - step / 2).toFixed(6))} ${Number((lat - step / 2).toFixed(6))}, ${Number((lng + step / 2).toFixed(6))} ${Number((lat - step / 2).toFixed(6))}, ${Number((lng + step / 2).toFixed(6))} ${Number((lat + step / 2).toFixed(6))}, ${Number((lng - step / 2).toFixed(6))} ${Number((lat + step / 2).toFixed(6))}, ${Number((lng - step / 2).toFixed(6))} ${Number((lat - step / 2).toFixed(6))}))`;

      const gridId = grid.GRID_ID || grid.id;
      const btsCount = typeof grid.TOTAL_BTS === 'number' ? grid.TOTAL_BTS : (grid.bts ?? 1);
      const sfCat = (grid['SF Grid Category'] || grid.SF_Grid_Category || grid.cat || '1st Priority Acquisition') as GridCategory;
      const derived = deriveGridTelecomMetrics(gridId, sfCat, grid, btsCount);

      setFormData({
        ...grid,
        GRID_ID: gridId,
        REGION: grid.REGION || grid.Region || 'EAST JAVA',
        PROVINCE: grid.PROVINCE || grid.Province || 'JAWA TIMUR (4672)',
        CITY: grid.CITY || grid.City || 'KAB. BANGKALAN',
        KECAMATAN: grid.KECAMATAN || grid.Kecamatan || 'Bangkalan',
        'SF Grid Category': sfCat,
        'Mapping Promotor': grid['Mapping Promotor'] || grid.prom || 'MULTIBRAND',
        'Center Long': Number(lng.toFixed(6)),
        'Center Lat': Number(lat.toFixed(6)),
        'Geometry WKT': grid['Geometry WKT'] || grid.Geometry_WKT || defaultWkt,
        POPULATION: typeof grid.POPULATION === 'number' ? grid.POPULATION : (grid.pop ?? 8500),
        'MS_XLCo.': formatMSAbsolute(grid['MS_XLCo.'] ?? grid.xlco ?? derived.msXLCo),
        MS_SF: formatMSAbsolute(grid.MS_SF ?? grid.sf ?? derived.msSF),
        MS_IM3: formatMSAbsolute(grid.MS_IM3 ?? grid.im3 ?? derived.msIM3),
        MS_3TRI: formatMSAbsolute(grid.MS_3TRI ?? grid.tri ?? derived.ms3TRI),
        MS_TSEL: formatMSAbsolute(grid.MS_TSEL ?? grid.tsel ?? derived.msTSEL),
        MS_XLS: formatMSAbsolute(grid.MS_XLS ?? grid.xls ?? grid.xl ?? derived.msXLS),
        MS_IOH: formatMSAbsolute(grid.MS_IOH ?? grid.ioh ?? derived.msIOH),
        P10_DL_Speed_XLCo: derived.p10XLCo,
        P10_DL_Speed_SF: derived.p10SF,
        TOTAL_POI: typeof grid.TOTAL_POI === 'number' ? grid.TOTAL_POI : (grid.poi ?? 8),
        TOTAL_BTS: btsCount,
        TOTAL_BTS_RESIDENTIAL: derived.totalBtsResidential,

        id: gridId,
        sitename: grid.sitename || `${grid.KECAMATAN || grid.Kecamatan} Grid ${gridId.slice(-4)}`,
        site_type: grid.site_type || 'Macro',
        Province: grid.PROVINCE || grid.Province || 'JAWA TIMUR (4672)',
        City: grid.CITY || grid.City || 'KAB. BANGKALAN',
        Kecamatan: grid.KECAMATAN || grid.Kecamatan || 'Bangkalan',
        Region: grid.REGION || grid.Region || 'EAST JAVA',
        latitude: lat,
        longitude: lng,
        GRID_META_ID: grid.GRID_META_ID || `GM-${gridId}`,
        Rev_August_2026: grid.Rev_August_2026 !== undefined ? grid.Rev_August_2026 : 35000000,
        Revenue_Flag: grid.Revenue_Flag || 'Rev 30-40 Mn',
        SF_Grid_Category: sfCat,
        Geometry_WKT: grid['Geometry WKT'] || grid.Geometry_WKT || defaultWkt,
        Device_Status: grid.Device_Status || 'Active'
      });
    } else {
      const newId = `3526${Math.floor(100000 + Math.random() * 900000)}`;
      const lat = -7.045;
      const lng = 112.915;
      const step = 0.022;
      const defaultWkt = `POLYGON ((${Number((lng - step / 2).toFixed(6))} ${Number((lat - step / 2).toFixed(6))}, ${Number((lng + step / 2).toFixed(6))} ${Number((lat - step / 2).toFixed(6))}, ${Number((lng + step / 2).toFixed(6))} ${Number((lat + step / 2).toFixed(6))}, ${Number((lng - step / 2).toFixed(6))} ${Number((lat + step / 2).toFixed(6))}, ${Number((lng - step / 2).toFixed(6))} ${Number((lat - step / 2).toFixed(6))}))`;
      const derived = deriveGridTelecomMetrics(newId, '1st Priority Acquisition', {}, 2);

      setFormData({
        GRID_ID: newId,
        REGION: 'EAST JAVA',
        PROVINCE: 'JAWA TIMUR (4672)',
        CITY: 'KAB. BANGKALAN',
        KECAMATAN: 'Bangkalan',
        'SF Grid Category': '1st Priority Acquisition',
        'Mapping Promotor': 'MULTIBRAND',
        'Center Long': lng,
        'Center Lat': lat,
        'Geometry WKT': defaultWkt,
        POPULATION: 8500,
        'MS_XLCo.': derived.msXLCo,
        MS_SF: derived.msSF,
        MS_IM3: derived.msIM3,
        MS_3TRI: derived.ms3TRI,
        MS_TSEL: derived.msTSEL,
        MS_XLS: derived.msXLS,
        MS_IOH: derived.msIOH,
        P10_DL_Speed_XLCo: derived.p10XLCo,
        P10_DL_Speed_SF: derived.p10SF,
        TOTAL_POI: 12,
        TOTAL_BTS: 2,
        TOTAL_BTS_RESIDENTIAL: derived.totalBtsResidential,

        id: newId,
        sitename: `Bangkalan Sentral Baru`,
        site_type: 'Macro',
        Province: 'JAWA TIMUR (4672)',
        City: 'KAB. BANGKALAN',
        Kecamatan: 'Bangkalan',
        Region: 'EAST JAVA',
        latitude: lat,
        longitude: lng,
        GRID_META_ID: `GM-${newId}`,
        Rev_August_2026: 45000000,
        Revenue_Flag: 'Rev >40 Mn',
        SF_Grid_Category: '1st Priority Acquisition',
        Geometry_WKT: defaultWkt,
        Device_Status: 'Active'
      });
    }
  }, [grid, isOpen]);

  if (!isOpen) return null;

  const handleCoordsChange = (newLat: number, newLng: number) => {
    const step = 0.022;
    const wkt = `POLYGON ((${Number((newLng - step / 2).toFixed(6))} ${Number((newLat - step / 2).toFixed(6))}, ${Number((newLng + step / 2).toFixed(6))} ${Number((newLat - step / 2).toFixed(6))}, ${Number((newLng + step / 2).toFixed(6))} ${Number((newLat + step / 2).toFixed(6))}, ${Number((newLng - step / 2).toFixed(6))} ${Number((newLat + step / 2).toFixed(6))}, ${Number((newLng - step / 2).toFixed(6))} ${Number((newLat - step / 2).toFixed(6))}))`;

    setFormData((prev) => ({
      ...prev,
      'Center Lat': newLat,
      'Center Long': newLng,
      latitude: newLat,
      longitude: newLng,
      'Geometry WKT': wkt,
      Geometry_WKT: wkt
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const gridId = formData.GRID_ID || formData.id;
    if (!gridId || !formData.CITY) return;

    setSaving(true);
    try {
      const lat = Number(formData['Center Lat'] ?? formData.latitude) || -7.05;
      const lng = Number(formData['Center Long'] ?? formData.longitude) || 112.92;
      const step = 0.022;
      const bounds: [[number, number], [number, number]] = [
        [lat - step / 2, lng - step / 2],
        [lat + step / 2, lng + step / 2]
      ];

      const cat = (formData['SF Grid Category'] || formData.SF_Grid_Category || formData.cat || '1st Priority Acquisition') as GridCategory;
      const defaultWkt = `POLYGON ((${lng - step / 2} ${lat - step / 2}, ${lng + step / 2} ${lat - step / 2}, ${lng + step / 2} ${lat + step / 2}, ${lng - step / 2} ${lat + step / 2}, ${lng - step / 2} ${lat - step / 2}))`;
      const wkt = formData['Geometry WKT'] || formData.Geometry_WKT || defaultWkt;

      const pop = Number(formData.POPULATION ?? formData.pop) || 8500;
      const bts = Number(formData.TOTAL_BTS ?? formData.bts) || 1;
      const poi = Number(formData.TOTAL_POI ?? formData.poi) || 8;
      const promotor = formData['Mapping Promotor'] || formData.prom || 'MULTIBRAND';

      const derived = deriveGridTelecomMetrics(gridId, cat, formData, bts);

      const fullGrid: GridItem = {
        // 23 Exact database headers requested by user:
        GRID_ID: gridId,
        REGION: formData.REGION || formData.Region || 'EAST JAVA',
        PROVINCE: formData.PROVINCE || formData.Province || 'JAWA TIMUR (4672)',
        CITY: formData.CITY || formData.City || 'KAB. BANGKALAN',
        KECAMATAN: formData.KECAMATAN || formData.Kecamatan || 'Bangkalan',
        'SF Grid Category': cat,
        'Mapping Promotor': promotor,
        'Center Long': lng,
        'Center Lat': lat,
        'Geometry WKT': wkt,
        POPULATION: pop,
        'MS_XLCo.': formatMSAbsolute(formData['MS_XLCo.'] ?? derived.msXLCo),
        MS_SF: formatMSAbsolute(formData.MS_SF ?? derived.msSF),
        MS_IM3: formatMSAbsolute(formData.MS_IM3 ?? derived.msIM3),
        MS_3TRI: formatMSAbsolute(formData.MS_3TRI ?? derived.ms3TRI),
        MS_TSEL: formatMSAbsolute(formData.MS_TSEL ?? derived.msTSEL),
        MS_XLS: formatMSAbsolute(formData.MS_XLS ?? derived.msXLS),
        MS_IOH: formatMSAbsolute(formData.MS_IOH ?? derived.msIOH),
        P10_DL_Speed_XLCo: formData.P10_DL_Speed_XLCo || derived.p10XLCo,
        P10_DL_Speed_SF: formData.P10_DL_Speed_SF || derived.p10SF,
        TOTAL_POI: poi,
        TOTAL_BTS: bts,
        TOTAL_BTS_RESIDENTIAL: formData.TOTAL_BTS_RESIDENTIAL !== undefined ? Number(formData.TOTAL_BTS_RESIDENTIAL) : derived.totalBtsResidential,

        // Backward compatibility
        id: gridId,
        sitename: formData.sitename || `${formData.KECAMATAN} Grid ${gridId.slice(-4)}`,
        site_type: formData.site_type || 'Macro',
        Province: formData.PROVINCE || formData.Province || 'JAWA TIMUR (4672)',
        City: formData.CITY || formData.City || 'KAB. BANGKALAN',
        Kecamatan: formData.KECAMATAN || formData.Kecamatan || 'Bangkalan',
        Region: formData.REGION || formData.Region || 'EAST JAVA',
        latitude: lat,
        longitude: lng,
        GRID_META_ID: formData.GRID_META_ID || `GM-${gridId}`,
        Rev_August_2026: formData.Rev_August_2026 ?? 35000000,
        Revenue_Flag: formData.Revenue_Flag || 'Rev 30-40 Mn',
        SF_Grid_Category: cat,
        Geometry_WKT: wkt,
        Device_Status: formData.Device_Status || 'Active',

        region: formData.REGION || 'EAST JAVA',
        province: formData.PROVINCE || 'JAWA TIMUR (4672)',
        city: formData.CITY || 'KAB. BANGKALAN',
        kecamatan: formData.KECAMATAN || 'Bangkalan',
        cat,
        bounds,
        center: [lat, lng],
        pop,
        tsel: formatMSAbsolute(formData.MS_TSEL || '35.2'),
        xlco: formatMSAbsolute(formData['MS_XLCo.'] || '28.5'),
        xl: formatMSAbsolute(formData.MS_XLS || '16.8'),
        ioh: formatMSAbsolute(formData.MS_IOH || '22.6'),
        sf: formatMSAbsolute(formData.MS_SF || '18.4'),
        bts,
        poi,
        prom: promotor
      };

      await onSave(fullGrid);
      onClose();
    } catch (err: any) {
      alert('Gagal menyimpan grid: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl p-6 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <span>{grid ? `Edit Database Grid #${grid.GRID_ID || grid.id}` : 'Tambah Database Grid Baru'}</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              23 Headers: GRID_ID, REGION, PROVINCE, CITY, KECAMATAN, SF Grid Category, Mapping Promotor, Center Long, Center Lat, Geometry WKT, POPULATION, MS_XLCo., MS_SF, MS_IM3, MS_3TRI, MS_TSEL, MS_XLS, MS_IOH, P10_DL_Speed_XLCo, P10_DL_Speed_SF, TOTAL_POI, TOTAL_BTS, TOTAL_BTS_RESIDENTIAL
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Section 1: Identitas Wilayah */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">1. Identitas & Hierarki Wilayah</h4>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">GRID_ID</label>
                <input
                  type="text"
                  required
                  value={formData.GRID_ID || formData.id || ''}
                  onChange={(e) => setFormData({ ...formData, GRID_ID: e.target.value, id: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono font-bold"
                  placeholder="3526001001"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">REGION</label>
                <input
                  type="text"
                  required
                  value={formData.REGION || ''}
                  onChange={(e) => setFormData({ ...formData, REGION: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-medium"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">PROVINCE</label>
                <input
                  type="text"
                  required
                  value={formData.PROVINCE || ''}
                  onChange={(e) => setFormData({ ...formData, PROVINCE: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">CITY</label>
                <input
                  type="text"
                  required
                  value={formData.CITY || ''}
                  onChange={(e) => setFormData({ ...formData, CITY: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">KECAMATAN</label>
                <input
                  type="text"
                  required
                  value={formData.KECAMATAN || ''}
                  onChange={(e) => setFormData({ ...formData, KECAMATAN: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 2: SF Strategy & Koordinat */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">2. Strategi Smartfren & Koordinat Center</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-amber-400 font-bold uppercase text-[10px]">SF Grid Category</label>
                  <button
                    type="button"
                    onClick={() => {
                      const derived = deriveGridTelecomMetrics(
                        formData.GRID_ID || '3526001000',
                        (formData['SF Grid Category'] || '1st Priority Acquisition') as GridCategory,
                        {},
                        Number(formData.TOTAL_BTS) || 0
                      );
                      setFormData(prev => ({
                        ...prev,
                        'MS_XLCo.': derived.msXLCo,
                        MS_SF: derived.msSF,
                        MS_IM3: derived.msIM3,
                        MS_3TRI: derived.ms3TRI,
                        MS_TSEL: derived.msTSEL,
                        MS_XLS: derived.msXLS,
                        MS_IOH: derived.msIOH,
                        P10_DL_Speed_XLCo: derived.p10XLCo,
                        P10_DL_Speed_SF: derived.p10SF,
                        TOTAL_BTS_RESIDENTIAL: derived.totalBtsResidential
                      }));
                    }}
                    className="text-[9px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                    title="Sinkronkan metrik Market Share & Speed sesuai status"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Sync</span>
                  </button>
                </div>
                <select
                  value={formData['SF Grid Category'] || formData.SF_Grid_Category || '1st Priority Acquisition'}
                  onChange={(e) => {
                    const newCat = e.target.value as GridCategory;
                    const derived = deriveGridTelecomMetrics(
                      formData.GRID_ID || '3526001000',
                      newCat,
                      {},
                      Number(formData.TOTAL_BTS) || 0
                    );
                    setFormData({
                      ...formData,
                      'SF Grid Category': newCat,
                      SF_Grid_Category: newCat,
                      'MS_XLCo.': derived.msXLCo,
                      MS_SF: derived.msSF,
                      MS_IM3: derived.msIM3,
                      MS_3TRI: derived.ms3TRI,
                      MS_TSEL: derived.msTSEL,
                      MS_XLS: derived.msXLS,
                      MS_IOH: derived.msIOH,
                      P10_DL_Speed_XLCo: derived.p10XLCo,
                      P10_DL_Speed_SF: derived.p10SF,
                      TOTAL_BTS_RESIDENTIAL: derived.totalBtsResidential
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-semibold"
                >
                  <option value="1st Priority Acquisition">1st Priority Acquisition</option>
                  <option value="2nd Priority Acquisition">2nd Priority Acquisition</option>
                  <option value="3rd Priority">3rd Priority</option>
                  <option value="Avoid Cannibalism">Avoid Cannibalism</option>
                </select>
              </div>
              <div>
                <label className="block text-indigo-400 font-bold mb-1 uppercase text-[10px]">Mapping Promotor</label>
                <select
                  value={formData['Mapping Promotor'] || 'MULTIBRAND'}
                  onChange={(e) => setFormData({ ...formData, 'Mapping Promotor': e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-semibold"
                >
                  <option value="MULTIBRAND">MULTIBRAND</option>
                  <option value="SINGLEBRAND">SINGLEBRAND</option>
                  <option value="DIRECT">DIRECT</option>
                  <option value="HYBRID">HYBRID</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">Center Long</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData['Center Long'] ?? formData.longitude ?? 112.915}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    handleCoordsChange(formData['Center Lat'] ?? -7.045, val);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">Center Lat</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData['Center Lat'] ?? formData.latitude ?? -7.045}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    handleCoordsChange(val, formData['Center Long'] ?? 112.915);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Demografi, POI & BTS Counts */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">3. Demografi, POI & Tower Density</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">POPULATION</label>
                <input
                  type="number"
                  value={formData.POPULATION ?? 8500}
                  onChange={(e) => setFormData({ ...formData, POPULATION: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-amber-400 font-bold mb-1 uppercase text-[10px]">TOTAL_POI</label>
                <input
                  type="number"
                  value={formData.TOTAL_POI ?? 8}
                  onChange={(e) => setFormData({ ...formData, TOTAL_POI: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-blue-400 font-bold mb-1 uppercase text-[10px]">TOTAL_BTS</label>
                <input
                  type="number"
                  value={formData.TOTAL_BTS ?? 2}
                  onChange={(e) => setFormData({ ...formData, TOTAL_BTS: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">TOTAL_BTS_RESIDENTIAL</label>
                <input
                  type="number"
                  value={formData.TOTAL_BTS_RESIDENTIAL ?? 2}
                  onChange={(e) => setFormData({ ...formData, TOTAL_BTS_RESIDENTIAL: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Market Shares & Network Speeds */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">4. Market Share Operator & P10 Speed</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-emerald-400 font-bold mb-1 uppercase text-[10px]">MS_SF (Absolute)</label>
                <input
                  type="text"
                  value={formatMSAbsolute(formData.MS_SF || '18.4')}
                  onChange={(e) => setFormData({ ...formData, MS_SF: formatMSAbsolute(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-emerald-400 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-blue-400 font-bold mb-1 uppercase text-[10px]">MS_XLCo. (Absolute)</label>
                <input
                  type="text"
                  value={formatMSAbsolute(formData['MS_XLCo.'] || '28.5')}
                  onChange={(e) => setFormData({ ...formData, 'MS_XLCo.': formatMSAbsolute(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-red-400 font-bold mb-1 uppercase text-[10px]">MS_TSEL (Absolute)</label>
                <input
                  type="text"
                  value={formatMSAbsolute(formData.MS_TSEL || '35.2')}
                  onChange={(e) => setFormData({ ...formData, MS_TSEL: formatMSAbsolute(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-amber-400 font-bold mb-1 uppercase text-[10px]">MS_IOH (Absolute)</label>
                <input
                  type="text"
                  value={formatMSAbsolute(formData.MS_IOH || '22.6')}
                  onChange={(e) => setFormData({ ...formData, MS_IOH: formatMSAbsolute(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">MS_IM3 (Absolute)</label>
                <input
                  type="text"
                  value={formatMSAbsolute(formData.MS_IM3 || '14.1')}
                  onChange={(e) => setFormData({ ...formData, MS_IM3: formatMSAbsolute(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">MS_3TRI (Absolute)</label>
                <input
                  type="text"
                  value={formatMSAbsolute(formData.MS_3TRI || '8.5')}
                  onChange={(e) => setFormData({ ...formData, MS_3TRI: formatMSAbsolute(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">MS_XLS (Absolute)</label>
                <input
                  type="text"
                  value={formatMSAbsolute(formData.MS_XLS || '16.8')}
                  onChange={(e) => setFormData({ ...formData, MS_XLS: formatMSAbsolute(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-emerald-400 font-bold mb-1 uppercase text-[10px]">P10_DL_Speed_SF</label>
                <input
                  type="text"
                  value={formData.P10_DL_Speed_SF || '22.8 Mbps'}
                  onChange={(e) => setFormData({ ...formData, P10_DL_Speed_SF: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-emerald-400 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">P10_DL_Speed_XLCo</label>
                <input
                  type="text"
                  value={formData.P10_DL_Speed_XLCo || '16.4 Mbps'}
                  onChange={(e) => setFormData({ ...formData, P10_DL_Speed_XLCo: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Geometry WKT */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-400 font-bold uppercase text-[10px]">Geometry WKT (GIS Polygon)</label>
              <button
                type="button"
                onClick={() => {
                  const lat = Number(formData['Center Lat'] ?? formData.latitude) || -7.045;
                  const lng = Number(formData['Center Long'] ?? formData.longitude) || 112.915;
                  handleCoordsChange(lat, lng);
                }}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Hitung Ulang Polygon WKT dari Center Long & Lat</span>
              </button>
            </div>
            <textarea
              rows={2}
              value={formData['Geometry WKT'] || formData.Geometry_WKT || ''}
              onChange={(e) => setFormData({ ...formData, 'Geometry WKT': e.target.value, Geometry_WKT: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono text-[11px]"
              placeholder="POLYGON ((112.66 -7.22, 112.68 -7.22, ...))"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan 23 Atribut ke Database...' : 'Simpan ke Database'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2.5 rounded-lg transition cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
