import React, { useState, useEffect } from 'react';
import { X, Save, MapPin } from 'lucide-react';
import type { BTSItem, RevenueFlag } from '../types';
import { TowerIcon } from './TelecomIcons';

interface BTSEditModalProps {
  isOpen: boolean;
  bts: BTSItem | null;
  onClose: () => void;
  onSave: (bts: BTSItem) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export const BTSEditModal: React.FC<BTSEditModalProps> = ({
  isOpen,
  bts,
  onClose,
  onSave,
  onDelete
}) => {
  const [formData, setFormData] = useState<BTSItem>({
    'Meta Grid ID': '3526001000',
    REGION: 'EAST JAVA',
    PROVINCE: 'JAWA TIMUR (4672)',
    'XLS CITY': 'KAB. BANGKALAN',
    KECAMATAN: 'Bangkalan',
    POI_ID: '',
    POI_NAME_RAW: '',
    POI_NAME: '',
    TAXON_NAME_RAW: 'Residential',
    TAXON_NAME: 'Macro',
    LATITUDE: -7.054,
    LONGITUDE: 112.742,

    id: '',
    sitename: '',
    'Aging (Month)': 24,
    site_type: 'Macro',
    'Site Function': 'Residential',
    Province: 'JAWA TIMUR (4672)',
    City: 'KAB. BANGKALAN',
    Kecamatan: 'Bangkalan',
    latitude: -7.054,
    ongitude: 112.742,
    Region: 'EAST JAVA',
    GRID_META_ID: '3526001000',
    'Rev.2026': 45000000,
    'Revenue Flag': 'Rev >40 Mn',
    'BSP Data': 'Smartfren Fiber Core',
    'Geometry WKT': 'POINT (112.742000 -7.054000)'
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (bts) {
      const lat = typeof bts.LATITUDE === 'number' ? bts.LATITUDE : (bts.latitude ?? bts.lat ?? -7.054);
      const lng = typeof bts.LONGITUDE === 'number' ? bts.LONGITUDE : (bts.ongitude ?? bts.longitude ?? bts.lng ?? 112.742);
      const metaGridId = bts['Meta Grid ID'] || bts.GRID_META_ID || bts.grid || `GM-${bts.id}`;
      const region = bts.REGION || bts.Region || bts.region || 'EAST JAVA';
      const province = bts.PROVINCE || bts.Province || bts.province || 'JAWA TIMUR (4672)';
      const xlsCity = bts['XLS CITY'] || bts.City || bts.city || 'KAB. BANGKALAN';
      const kecamatan = bts.KECAMATAN || bts.Kecamatan || bts.kec || 'Bangkalan';
      const poiId = bts.POI_ID || bts.id || '';
      const poiName = bts.POI_NAME || bts.sitename || bts.name || '';
      const poiNameRaw = bts.POI_NAME_RAW || `${poiName}_RAW`;
      const taxonName = bts.TAXON_NAME || bts.site_type || bts.type || 'Macro';
      const taxonNameRaw = bts.TAXON_NAME_RAW || bts['Site Function'] || bts.func || 'Residential';

      const wkt = bts['Geometry WKT'] || bts.Geometry_WKT || `POINT (${lng.toFixed(6)} ${lat.toFixed(6)})`;
      const aging = bts['Aging (Month)'] ?? bts.aging_month ?? 24;
      const rev = bts['Rev.2026'] ?? bts.Rev_2026 ?? 45000000;
      const revFlag = bts['Revenue Flag'] || bts.rev || 'Rev >40 Mn';
      const bsp = bts['BSP Data'] || bts.bsp_data || 'Smartfren Fiber Core';

      setFormData({
        ...bts,
        'Meta Grid ID': metaGridId,
        REGION: region,
        PROVINCE: province,
        'XLS CITY': xlsCity,
        KECAMATAN: kecamatan,
        POI_ID: poiId,
        POI_NAME_RAW: poiNameRaw,
        POI_NAME: poiName,
        TAXON_NAME_RAW: taxonNameRaw,
        TAXON_NAME: taxonName,
        LATITUDE: lat,
        LONGITUDE: lng,

        id: poiId,
        sitename: poiName,
        name: poiName,
        'Aging (Month)': aging,
        site_type: taxonName,
        'Site Function': taxonNameRaw,
        Province: province,
        City: xlsCity,
        Kecamatan: kecamatan,
        latitude: lat,
        ongitude: lng,
        Region: region,
        GRID_META_ID: metaGridId,
        'Rev.2026': rev,
        'Revenue Flag': revFlag,
        'BSP Data': bsp,
        'Geometry WKT': wkt,

        type: taxonName,
        func: taxonNameRaw,
        province,
        city: xlsCity,
        kec: kecamatan,
        grid: metaGridId,
        rev: revFlag as RevenueFlag,
        lat,
        lng,
        longitude: lng,
        bsp_data: bsp,
        Geometry_WKT: wkt
      });
    }
  }, [bts, isOpen]);

  if (!isOpen || !bts) return null;

  // Coordinate change
  const handleCoordChange = (field: 'LATITUDE' | 'LONGITUDE', value: number) => {
    setFormData(prev => {
      const newLat = field === 'LATITUDE' ? value : prev.LATITUDE;
      const newLng = field === 'LONGITUDE' ? value : prev.LONGITUDE;
      const newWkt = `POINT (${newLng.toFixed(6)} ${newLat.toFixed(6)})`;
      return {
        ...prev,
        [field]: value,
        LATITUDE: newLat,
        LONGITUDE: newLng,
        latitude: newLat,
        ongitude: newLng,
        lat: newLat,
        lng: newLng,
        longitude: newLng,
        'Geometry WKT': newWkt,
        Geometry_WKT: newWkt
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const toSave: BTSItem = {
        ...formData,
        'Meta Grid ID': formData['Meta Grid ID'],
        REGION: formData.REGION,
        PROVINCE: formData.PROVINCE,
        'XLS CITY': formData['XLS CITY'],
        KECAMATAN: formData.KECAMATAN,
        POI_ID: formData.POI_ID,
        POI_NAME_RAW: formData.POI_NAME_RAW,
        POI_NAME: formData.POI_NAME,
        TAXON_NAME_RAW: formData.TAXON_NAME_RAW,
        TAXON_NAME: formData.TAXON_NAME,
        LATITUDE: formData.LATITUDE,
        LONGITUDE: formData.LONGITUDE,

        // Aliases
        id: formData.POI_ID,
        sitename: formData.POI_NAME,
        name: formData.POI_NAME,
        site_type: formData.TAXON_NAME,
        type: formData.TAXON_NAME,
        'Site Function': formData.TAXON_NAME_RAW,
        func: formData.TAXON_NAME_RAW,
        Province: formData.PROVINCE,
        province: formData.PROVINCE,
        City: formData['XLS CITY'],
        city: formData['XLS CITY'],
        Kecamatan: formData.KECAMATAN,
        kec: formData.KECAMATAN,
        Region: formData.REGION,
        region: formData.REGION,
        GRID_META_ID: formData['Meta Grid ID'],
        grid: formData['Meta Grid ID'],
        latitude: formData.LATITUDE,
        ongitude: formData.LONGITUDE,
        lat: formData.LATITUDE,
        lng: formData.LONGITUDE,
        longitude: formData.LONGITUDE,
        Geometry_WKT: formData['Geometry WKT']
      };
      await onSave(toSave);
      onClose();
    } catch (err: any) {
      alert('Gagal update BTS: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[99999] isolate bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      style={{ zIndex: 99999 }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto my-auto">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl">
              <TowerIcon size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Edit BTS / TOWER #{formData.POI_ID || bts.id}</span>
                <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded font-mono font-bold">
                  12 Header Master
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Format: Meta Grid ID, REGION, PROVINCE, XLS CITY, KECAMATAN, POI_ID, POI_NAME_RAW, POI_NAME, TAXON_NAME_RAW, TAXON_NAME, LATITUDE, LONGITUDE
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Section 1: Grid & Wilayah (Meta Grid ID, REGION, PROVINCE, XLS CITY, KECAMATAN) */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-3">
            <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>1. Grid & Wilayah Administratif</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">Meta Grid ID</label>
                <input
                  type="text"
                  required
                  value={formData['Meta Grid ID']}
                  onChange={(e) => setFormData({ ...formData, 'Meta Grid ID': e.target.value, GRID_META_ID: e.target.value, grid: e.target.value })}
                  placeholder="Contoh: 3526001000 atau GM-3526001001"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-amber-300 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">REGION</label>
                <input
                  type="text"
                  required
                  value={formData.REGION}
                  onChange={(e) => setFormData({ ...formData, REGION: e.target.value, Region: e.target.value, region: e.target.value })}
                  placeholder="Contoh: EAST JAVA atau BALI NUSRA"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">PROVINCE</label>
                <input
                  type="text"
                  required
                  value={formData.PROVINCE}
                  onChange={(e) => setFormData({ ...formData, PROVINCE: e.target.value, Province: e.target.value, province: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">XLS CITY</label>
                <input
                  type="text"
                  required
                  value={formData['XLS CITY']}
                  onChange={(e) => setFormData({ ...formData, 'XLS CITY': e.target.value, City: e.target.value, city: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">KECAMATAN</label>
                <input
                  type="text"
                  required
                  value={formData.KECAMATAN}
                  onChange={(e) => setFormData({ ...formData, KECAMATAN: e.target.value, Kecamatan: e.target.value, kec: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Identifikasi Tower (POI_ID, POI_NAME_RAW, POI_NAME) */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-3">
            <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>2. Identifikasi Menara / Point (POI_ID &amp; POI_NAME)</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">POI_ID (BTS ID)</label>
                <input
                  type="text"
                  required
                  value={formData.POI_ID}
                  onChange={(e) => setFormData({ ...formData, POI_ID: e.target.value, id: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-cyan-400 font-mono font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">POI_NAME</label>
                <input
                  type="text"
                  required
                  value={formData.POI_NAME}
                  onChange={(e) => setFormData({ ...formData, POI_NAME: e.target.value, sitename: e.target.value, name: e.target.value })}
                  placeholder="Contoh: BKL-SOC-001"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">POI_NAME_RAW</label>
                <input
                  type="text"
                  value={formData.POI_NAME_RAW}
                  onChange={(e) => setFormData({ ...formData, POI_NAME_RAW: e.target.value })}
                  placeholder="Contoh: TOWER BANGKALAN SOCAH 01"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-300 font-mono text-[11px]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Taksonomi & Koordinat (TAXON_NAME_RAW, TAXON_NAME, LATITUDE, LONGITUDE) */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-3">
            <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>3. Taksonomi Tipe &amp; Koordinat Geospasial</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">TAXON_NAME (Tipe Menara)</label>
                <input
                  type="text"
                  value={formData.TAXON_NAME}
                  onChange={(e) => setFormData({ ...formData, TAXON_NAME: e.target.value, site_type: e.target.value, type: e.target.value })}
                  placeholder="Macro / Micro / Small Cell / Pole"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">TAXON_NAME_RAW (Fungsi / Deskripsi)</label>
                <input
                  type="text"
                  value={formData.TAXON_NAME_RAW}
                  onChange={(e) => setFormData({ ...formData, TAXON_NAME_RAW: e.target.value, 'Site Function': e.target.value, func: e.target.value })}
                  placeholder="Residential / Commercial / Cellular Macro Tower"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">LATITUDE</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.LATITUDE}
                  onChange={(e) => handleCoordChange('LATITUDE', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-emerald-400 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">LONGITUDE</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.LONGITUDE}
                  onChange={(e) => handleCoordChange('LONGITUDE', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-emerald-400 font-mono font-bold"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow cursor-pointer text-xs"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Data BTS (12 Header Master)'}</span>
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Hapus BTS '${formData.POI_NAME || bts.id}' dari database?`)) {
                    onDelete(formData.POI_ID || bts.id);
                    onClose();
                  }
                }}
                className="bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 px-4 py-2.5 rounded-xl transition cursor-pointer text-xs font-semibold"
              >
                Hapus
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
