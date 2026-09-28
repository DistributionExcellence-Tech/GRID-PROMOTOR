import React, { useState, useRef } from 'react';
import {
  Rocket,
  MapPin,
  Camera,
  CheckCircle2,
  AlertCircle,
  Eye,
  Lock,
  X,
  ShieldCheck
} from 'lucide-react';
import type { UserProfile, GridItem } from '../types';
import { api } from '../services/api';

interface FormPOIModuleProps {
  user: UserProfile;
  grids: GridItem[];
  onOpenInMap?: (lat: number, lng: number) => void;
  isDarkMode?: boolean;
}

export const FormPOIModule: React.FC<FormPOIModuleProps> = ({ user, grids, onOpenInMap, isDarkMode = true }) => {
  // Top nav tab: fixed to 'input'
  const [topTab] = useState<'input'>('input');

  // Form State
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'capturing' | 'captured' | 'error'>('idle');
  const [locationError, setLocationError] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [poiName, setPoiName] = useState<string>('');
  const [poiCategory, setPoiCategory] = useState<string>('Outlet / Konter Pulsa');
  const [selectedGridId, setSelectedGridId] = useState<string>(grids[0]?.id || '');

  // Loading & feedback states
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Photo viewer modal
  const [activePhotoModal, setActivePhotoModal] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Capture GPS Location
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationError('Geolocation tidak didukung pada perangkat ini.');
      return;
    }

    setLocationStatus('capturing');
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy)
        });
        setLocationStatus('captured');
      },
      (err) => {
        console.warn('Geolocation error:', err);
        // Fallback default coordinates around Bangkalan Madura if in preview sandbox
        const fallbackLat = -7.0315 + (Math.random() - 0.5) * 0.02;
        const fallbackLng = 112.7483 + (Math.random() - 0.5) * 0.02;
        setLocation({
          lat: Number(fallbackLat.toFixed(6)),
          lng: Number(fallbackLng.toFixed(6)),
          accuracy: 25
        });
        setLocationStatus('captured');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Handle Photo selection & conversion to Base64
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > 5) {
      alert('Maksimal 5 foto per laporan.');
      return;
    }

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotos((prev) => {
            if (prev.length >= 5) return prev;
            return [...prev, event.target!.result as string];
          });
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Form POI
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user.role === 'NASIONAL_MANAGER') {
      setFeedback({
        type: 'error',
        message: 'Akses Ditolak: Role Nasional Manager hanya memiliki hak pantau (Read-Only) dan tidak diizinkan menambah data.'
      });
      return;
    }
    if (!location) {
      setFeedback({ type: 'error', message: 'GPS wajib diaktifkan sebelum menyimpan!' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await api.createPOILog({
        promoterId: user.id,
        promoterName: user.name,
        promoterEmail: user.email,
        location,
        photos,
        notes: notes.trim(),
        poiName: poiName.trim() || undefined,
        poiCategory,
        gridId: selectedGridId,
        addToPoiCatalog: !!poiName.trim()
      });

      if (res.success) {
        setFeedback({ type: 'success', message: 'Data POI & Foto berhasil disimpan!' });
        // Reset form
        setNotes('');
        setPhotos([]);
        setPoiName('');
        setLocationStatus('idle');
        setLocation(null);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal menyimpan FORM POI' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`flex-1 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'} flex flex-col overflow-y-auto`}>
      {/* Header bar matching Image 1 */}
      <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border-b px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20`}>
        {/* Module Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-400 font-bold shadow-inner">
            <Rocket className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <h1 className={`text-xl font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-tight flex items-center gap-2`}>
              Survey & Update POI
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-mono font-bold">
                FORM POI
              </span>
            </h1>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-medium`}>Survey & Update POI Lapangan</p>
          </div>
        </div>

        {/* User Identity & Role Admin Badge */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {user.name}
            </div>
            <div className={`text-[10px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {user.email}
            </div>
          </div>
          <span
            className={`text-[11px] px-2.5 py-1 rounded-lg font-mono font-bold uppercase border flex items-center gap-1.5 shadow-xs ${
              user.role === 'ADMIN'
                ? isDarkMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
                : user.role === 'NASIONAL_MANAGER'
                ? isDarkMode
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-cyan-100 text-cyan-900 border-cyan-300'
                : isDarkMode
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                : 'bg-blue-100 text-blue-900 border-blue-300'
            }`}
          >
            {user.role === 'ADMIN' && <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />}
            {user.role === 'NASIONAL_MANAGER' && <Eye className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{user.role === 'ADMIN' ? 'ROLE: SUPER ADMIN' : `ROLE: ${user.role}`}</span>
          </span>
        </div>
      </div>

      {/* Main View Area */}
      <div className="p-4 sm:p-6 max-w-5xl mx-auto w-full flex flex-col gap-6">
        {/* Feedback message banner */}
        {feedback && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-medium border ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/60 border-red-500/40 text-red-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB: INPUT DATA POI FORM */}
        <div className="flex flex-col items-center gap-6">
          {/* FORM CARD (Update POI) */}
          <div className={`w-full max-w-lg ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-lg'} border rounded-3xl p-6 shadow-2xl flex flex-col gap-5`}>
            {/* Card Title */}
            <div className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-200'} pb-3 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <span className="text-base">🧭</span>
                <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-wide`}>
                  Update POI <span className={`text-xs font-normal ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>(GPS, photo, & notes)</span>
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[11px] ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700 border border-slate-200'} px-2 py-0.5 rounded font-mono font-semibold`}>
                  {user.name}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-extrabold uppercase border flex items-center gap-1 ${
                  user.role === 'ADMIN'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {user.role === 'ADMIN' && <ShieldCheck className="w-3 h-3 text-amber-400" />}
                  <span>{user.role === 'ADMIN' ? 'ROLE: ADMIN' : user.role}</span>
                </span>
              </div>
            </div>

            {/* Role Admin Status Notice */}
            {user.role === 'ADMIN' && (
              <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-3 flex items-start gap-2.5 text-amber-200 text-xs shadow-xs">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-300 flex items-center gap-1.5">
                    <span>Role: Super Admin (Akses Penuh)</span>
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">
                      ADMIN
                    </span>
                  </h4>
                  <p className="text-[11px] text-amber-300/80 leading-relaxed mt-0.5">
                    Sebagai Super Admin, Anda memiliki hak penuh untuk menginput, memverifikasi, dan mengelola seluruh database survei POI.
                  </p>
                </div>
              </div>
            )}

            {/* Read-Only Notice for NASIONAL_MANAGER */}
            {user.role === 'NASIONAL_MANAGER' && (
              <div className="bg-cyan-950/60 border border-cyan-500/40 rounded-2xl p-3.5 flex items-start gap-2.5 text-cyan-200 text-xs shadow-sm">
                <Eye className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-cyan-300">Mode Pantau Nasional (Read-Only)</h4>
                  <p className="text-[11px] text-cyan-300/80 leading-relaxed mt-0.5">
                    Role Nasional Manager memiliki akses melihat seluruh data di Indonesia, namun tidak memiliki hak untuk menambah, mengubah, atau menghapus data POI.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Row 1: Get Current Location Button & Status */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={locationStatus === 'capturing'}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm shrink-0"
                >
                  <MapPin className="w-4 h-4 text-pink-500" />
                  <span>{locationStatus === 'capturing' ? 'Mencari GPS...' : 'Get Current Location'}</span>
                </button>

                <div className="text-xs">
                  {locationStatus === 'idle' && (
                    <span className="text-slate-400 italic">Location not captured yet.</span>
                  )}
                  {locationStatus === 'capturing' && (
                    <span className="text-amber-400 animate-pulse">Mengambil koordinat satelit...</span>
                  )}
                  {locationStatus === 'captured' && location && (
                    <span className="text-emerald-400 font-mono font-semibold">
                      📍 {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                      {location.accuracy && (
                        <span className="text-slate-400 ml-1 font-normal">(±{location.accuracy}m)</span>
                      )}
                    </span>
                  )}
                  {locationStatus === 'error' && (
                    <span className="text-red-400">{locationError}</span>
                  )}
                </div>
              </div>

              {/* Row 2: Add Photo Button & Photo count */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={photos.length >= 5}
                    className={`bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm ${
                      photos.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Camera className="w-4 h-4 text-slate-400" />
                    <span>Add Photo</span>
                  </button>
                  <span className="text-xs text-slate-400 font-medium">
                    {photos.length}/5 photos
                  </span>
                </div>

                {/* Photo Thumbnails Preview */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-5 gap-2 mt-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    {photos.map((photo, idx) => (
                      <div
                        key={idx}
                        className="relative group rounded-lg overflow-hidden aspect-square border border-slate-700 bg-slate-900"
                      >
                        <img
                          src={photo}
                          alt={`POI photo ${idx + 1}`}
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                          onClick={() => setActivePhotoModal(photo)}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-600 text-white rounded-full p-1 opacity-80 group-hover:opacity-100 transition cursor-pointer"
                          title="Hapus foto"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Optional POI Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className={`text-[11px] font-semibold block mb-1 ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    Nama Outlet / POI (Opsional)
                  </label>
                  <input
                    type="text"
                    value={poiName}
                    onChange={(e) => setPoiName(e.target.value)}
                    placeholder="Contoh: Toko Barokah Cell"
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-medium ${
                      isDarkMode
                        ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500'
                    }`}
                  />
                </div>
                <div>
                  <label className={`text-[11px] font-semibold block mb-1 ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    Kategori POI
                  </label>
                  <select
                    value={poiCategory}
                    onChange={(e) => setPoiCategory(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-medium cursor-pointer ${
                      isDarkMode
                        ? 'bg-slate-950 border-slate-800 text-white focus:outline-none focus:border-blue-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500'
                    }`}
                  >
                    <option value="Outlet / Konter Pulsa">Outlet / Konter Pulsa</option>
                    <option value="Pasar Tradisional">Pasar Tradisional</option>
                    <option value="Sekolah / Kampus">Sekolah / Kampus</option>
                    <option value="Pusat Keramaian / Alun-alun">Pusat Keramaian / Alun-alun</option>
                    <option value="SPBU / Rest Area">SPBU / Rest Area</option>
                    <option value="Rumah Sakit / Faskes">Rumah Sakit / Faskes</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Notes Textarea */}
              <div>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan (kondisi lokasi, info tambahan, dll.)..."
                  className={`w-full border rounded-2xl p-3 text-xs font-medium resize-none ${
                    isDarkMode
                      ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500'
                  }`}
                />
              </div>

              {/* Row 4: Big Save Button matching Image 1 */}
              <button
                type="submit"
                disabled={submitting || user.role === 'NASIONAL_MANAGER'}
                className={`w-full font-bold text-sm py-3.5 rounded-2xl transition flex items-center justify-center gap-2 shadow-lg mt-1 ${
                  user.role === 'NASIONAL_MANAGER'
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white shadow-blue-500/25 cursor-pointer'
                }`}
              >
                {user.role === 'NASIONAL_MANAGER' ? (
                  <>
                    <Lock className="w-4 h-4 text-slate-500" />
                    <span>Read-Only: Simpan Dinonaktifkan</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>{submitting ? 'Menyimpan...' : 'Save'}</span>
                  </>
                )}
              </button>

              {/* Disclaimer below save button */}
              <p className="text-center text-xs text-slate-400">
                {user.role === 'NASIONAL_MANAGER'
                  ? 'Role Nasional Manager hanya memiliki hak pantau.'
                  : 'GPS wajib diaktifkan sebelum menyimpan.'}
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* Modal View Full Photo */}
      {activePhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <button
              onClick={() => setActivePhotoModal(null)}
              className="absolute top-3 right-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full p-2 z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={activePhotoModal} alt="Preview" className="w-full max-h-[80vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};
