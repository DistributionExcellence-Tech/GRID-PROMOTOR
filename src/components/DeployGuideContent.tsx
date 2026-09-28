import React, { useState } from 'react';
import {
  Rocket,
  Globe,
  Check,
  Copy,
  ExternalLink,
  Server,
  Cloud,
  Terminal,
  ShieldCheck,
  Share2
} from 'lucide-react';

export const DeployGuideContent: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const currentPreUrl = 'https://ais-pre-ksh7zq5hqrtjxps4smwgjd-608673839885.asia-east1.run.app';
  const currentDevUrl = 'https://ais-dev-ksh7zq5hqrtjxps4smwgjd-608673839885.asia-east1.run.app';

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6 text-xs leading-relaxed text-slate-100">
      {/* Section 1: Link Live Saat Ini */}
      <div className="bg-gradient-to-r from-blue-950/40 to-slate-950/70 border border-blue-500/40 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-white text-xs flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400 animate-pulse" />
            URL Web Live Anda Saat Ini (Aktif di Cloud Run)
          </span>
          <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded font-mono">
            HTTPS AKTIF
          </span>
        </div>
        <p className="text-slate-300 text-[11px]">
          Aplikasi ini saat ini sudah berjalan pada infrastruktur Google Cloud Run dan memiliki tautan langsung yang dapat diakses:
        </p>

        {/* URL Box */}
        <div className="space-y-2">
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-mono shrink-0">
                Live URL
              </span>
              <span className="font-mono text-slate-200 text-xs truncate select-all">{currentPreUrl}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => copyToClipboard(currentPreUrl, 'pre')}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition cursor-pointer flex items-center gap-1"
                title="Salin Link"
              >
                {copiedKey === 'pre' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[10px]">{copiedKey === 'pre' ? 'Tersalin' : 'Salin'}</span>
              </button>
              <a
                href={currentPreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition cursor-pointer flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold">Buka Tab Baru</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: 3 Pilihan Cara Live */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Share2 className="w-4 h-4 text-blue-400" />
          Pilihan Cara Mempublikasikan & Menjalankan Web
        </h4>

        {/* Option 1 */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[11px]">
                1
              </span>
              <span className="font-bold text-white text-xs">
                Deploy 1-Klik Resmi via Google AI Studio (Paling Mudah)
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Direkomendasikan
            </span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Di antarmuka Google AI Studio Build, perhatikan bagian pojok kanan atas tampilan:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] pl-1">
            <li>
              Klik tombol <strong>"Deploy"</strong> atau <strong>"Share"</strong> di bilah atas AI Studio.
            </li>
            <li>
              Pilih target deployment ke <strong>Google Cloud Run</strong>.
            </li>
            <li>
              Sistem akan mengompilasi Vite dan server Express secara otomatis menjadi kontainer production dengan SSL HTTPS gratis.
            </li>
            <li>
              Tautan web yang dihasilkan dapat dibagikan langsung ke seluruh tim operasional, sales, dan manajemen.
            </li>
          </ol>
        </div>

        {/* Option 2 */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[11px]">
              2
            </span>
            <span className="font-bold text-white text-xs">
              Export Source Code ke GitHub atau Unduh ZIP
            </span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Jika Anda ingin menyimpan kode sumber di komputer pribadi atau repository perusahaan:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] pl-1">
            <li>
              Buka menu <strong>Settings</strong> di AI Studio (ikon roda gigi di pojok kanan).
            </li>
            <li>
              Pilih <strong>"Export to GitHub"</strong> untuk sync ke repositori GitHub Anda secara otomatis, atau <strong>"Export to ZIP"</strong> untuk mendownload file lengkap proyek ini.
            </li>
          </ul>
        </div>

        {/* Option 3 */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[11px]">
              3
            </span>
            <span className="font-bold text-white text-xs">
              Hosting Mandiri di Server / VPS Sendiri (Linux Ubuntu, PM2, atau Docker)
            </span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Jika Anda memiliki server VPS (DigitalOcean, AWS, GCP Compute Engine, Biznet, IDCloudHost):
          </p>

          <div className="space-y-2">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-slate-300 space-y-1.5 overflow-x-auto">
              <div className="text-slate-500"># 1. Clone atau upload source code ke server</div>
              <div className="text-emerald-400">git clone &lt;repo-url&gt; &amp;&amp; cd &lt;project-folder&gt;</div>
              <div className="text-slate-500 mt-2"># 2. Install dependencies &amp; build project</div>
              <div className="text-emerald-400">npm install</div>
              <div className="text-emerald-400">npm run build</div>
              <div className="text-slate-500 mt-2"># 3. Jalankan server production dengan PM2 agar auto-restart</div>
              <div className="text-emerald-400">npm install -g pm2</div>
              <div className="text-emerald-400">pm2 start dist/server.cjs --name "grid-promoter"</div>
              <div className="text-emerald-400">pm2 save &amp;&amp; pm2 startup</div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Akun Login Siap Pakai */}
      <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-2">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Kredensial Login Tim Operasional
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
            <div className="font-bold text-amber-400 text-xs">Super Admin (Akses Penuh CMS & Folder)</div>
            <div className="text-slate-300 font-mono text-[11px] mt-0.5">Email / User: <strong className="text-white">admin@xlsmart.co.id</strong></div>
            <div className="text-slate-400 text-[10px]">Atau ketik <strong>admin</strong> saat login</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
            <div className="font-bold text-blue-400 text-xs">Sales / Promotor Lapangan</div>
            <div className="text-slate-300 font-mono text-[11px] mt-0.5">User / Kode: <strong className="text-white">HARPA</strong> (atau nama promotor)</div>
            <div className="text-slate-400 text-[10px]">Akses input FORM POI & Network Check</div>
          </div>
        </div>
      </div>
    </div>
  );
};
