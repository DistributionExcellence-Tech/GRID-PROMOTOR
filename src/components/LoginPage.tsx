import React, { useState } from 'react';
import { Compass, Lock, ShieldAlert, ShieldCheck, AlertOctagon, Eye, EyeOff } from 'lucide-react';
import type { UserProfile } from '../types';
import { api } from '../services/api';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Masukkan User Name atau Email');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.login(username.trim(), password || '123');
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Akses Ditolak: Gagal login ke database');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 px-4 select-none overflow-y-auto py-8">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-7 shadow-2xl relative overflow-hidden my-auto">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Brand Header */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center mx-auto mb-2.5 shadow-inner">
            <Compass className="w-7 h-7 text-amber-400" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">GRID Promoter</h1>
          <p className="text-slate-400 text-xs mt-0.5 font-medium">
            Telecom GIS Analytics & Market Intelligence
          </p>

          {/* Security Enforcement Pill */}
          <div className="inline-flex items-center gap-1.5 bg-blue-950/80 border border-blue-500/40 text-blue-300 text-[11px] font-semibold px-3 py-1 rounded-full mt-3">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sistem Keamanan Role-Based Enforced</span>
          </div>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="mb-4 bg-red-950/60 border border-red-500/60 text-red-200 p-3 rounded-xl text-xs flex items-start gap-2.5 animate-shake">
            <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-left leading-relaxed">
              <span className="font-bold text-red-300 block">AKSES DITOLAK:</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              User Name / Email / Sales Code
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan email / kode sales terdaftar"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="******"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition font-medium tracking-wider"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3 text-[11px] text-slate-400 leading-relaxed">
            <div className="flex items-center gap-1.5 text-slate-300 font-bold mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Kebijakan Hak Akses:</span>
            </div>
            <p>
              Selain akun yang telah didaftarkan di <strong>Manajemen Pengguna Berdasarkan Role</strong>, tidak ada yang dapat masuk. Hubungi Super Admin untuk mendaftarkan akun baru atau membuka blokir status.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-extrabold py-2.5 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/20 cursor-pointer text-xs"
          >
            <Lock className="w-3.5 h-3.5 text-slate-950" />
            <span>{loading ? 'Memvalidasi Keamanan...' : 'Masuk Aplikasi'}</span>
          </button>

          {/* Quick Login Account Selector */}
          <div className="pt-2 border-t border-slate-800 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block text-center">
              Pilih Role Akun Cepat:
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setUsername('admin@xlsmart.co.id');
                  setPassword('admin');
                }}
                className="bg-slate-950 hover:bg-slate-800 border border-amber-500/40 text-amber-300 rounded-lg p-2 text-[11px] text-left transition flex items-center gap-1.5 cursor-pointer"
                title="Login sebagai Super Admin (admin@xlsmart.co.id)"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate font-bold">Role: Super Admin</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername('chandra.prima0117@gmail.com');
                  setPassword('admin');
                }}
                className="bg-slate-950 hover:bg-slate-800 border border-amber-500/40 text-amber-300 rounded-lg p-2 text-[11px] text-left transition flex items-center gap-1.5 cursor-pointer"
                title="Login sebagai Chandra Prima (Admin)"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate font-bold">Chandra (Admin)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername('region.balinusra@xlsmart.co.id');
                  setPassword('123');
                }}
                className="bg-slate-950 hover:bg-slate-800 border border-blue-500/40 text-blue-300 rounded-lg p-2 text-[11px] text-left transition flex items-center gap-1.5 cursor-pointer"
                title="Login sebagai Bali Nusra Regional Manager"
              >
                <span className="truncate font-medium">Regional Bali Nusra</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername('HARPA');
                  setPassword('123');
                }}
                className="bg-slate-950 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 rounded-lg p-2 text-[11px] text-left transition flex items-center gap-1.5 cursor-pointer"
                title="Login sebagai Harpa Sales Promoter"
              >
                <span className="truncate font-medium">Harpa Promoter</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
