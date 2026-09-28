import type { GridCategory } from '../types';
import { resolveSFGridCategory } from './telecomMetrics';

export interface CategoryTheme {
  category: GridCategory;
  shortLabel: string;
  colorLabel: 'Hijau' | 'Orange' | 'Merah' | 'Abu-abu' | 'Abu abu';
  statusDescription: string;
  hex: string;
  strokeHex: string;
  badgeDark: string;
  badgeLight: string;
  borderCard: string;
  textCard: string;
  dotClass: string;
}

export const CATEGORY_THEMES: Record<GridCategory, CategoryTheme> = {
  '1st Priority Acquisition': {
    category: '1st Priority Acquisition',
    shortLabel: '1st Priority',
    colorLabel: 'Hijau',
    statusDescription: '1st Priority Acquisition (Full Attack)',
    hex: '#10b981',
    strokeHex: '#059669',
    badgeDark: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-xs',
    badgeLight: 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs font-semibold',
    borderCard: 'border-emerald-500/40',
    textCard: 'text-emerald-400',
    dotClass: 'bg-emerald-400'
  },
  '2nd Priority Acquisition': {
    category: '2nd Priority Acquisition',
    shortLabel: '2nd Priority',
    colorLabel: 'Orange',
    statusDescription: '2nd Priority Acquisition (Opportunity)',
    hex: '#f97316',
    strokeHex: '#ea580c',
    badgeDark: 'bg-orange-500/20 text-orange-300 border border-orange-500/50 shadow-xs',
    badgeLight: 'bg-orange-100 text-orange-900 border border-orange-300 shadow-xs font-semibold',
    borderCard: 'border-orange-500/40',
    textCard: 'text-orange-400',
    dotClass: 'bg-orange-400'
  },
  '3rd Priority': {
    category: '3rd Priority',
    shortLabel: '3rd Priority',
    colorLabel: 'Merah',
    statusDescription: '3rd Priority (Low Opportunity)',
    hex: '#ef4444',
    strokeHex: '#dc2626',
    badgeDark: 'bg-red-500/20 text-red-300 border border-red-500/50 shadow-xs',
    badgeLight: 'bg-red-100 text-red-900 border border-red-300 shadow-xs font-semibold',
    borderCard: 'border-red-500/40',
    textCard: 'text-red-400',
    dotClass: 'bg-red-400'
  },
  'Avoid Cannibalism': {
    category: 'Avoid Cannibalism',
    shortLabel: 'Avoid Cannibalism',
    colorLabel: 'Abu-abu',
    statusDescription: 'Avoid Cannibalism (Proteksi Jaringan)',
    hex: '#64748b',
    strokeHex: '#475569',
    badgeDark: 'bg-slate-500/20 text-slate-300 border border-slate-500/50 shadow-xs',
    badgeLight: 'bg-slate-100 text-slate-800 border border-slate-300 shadow-xs font-semibold',
    borderCard: 'border-slate-500/40',
    textCard: 'text-slate-400',
    dotClass: 'bg-slate-400'
  }
};

export function getCategoryTheme(catRaw?: string | null): CategoryTheme {
  const cat = resolveSFGridCategory(catRaw);
  return CATEGORY_THEMES[cat];
}
