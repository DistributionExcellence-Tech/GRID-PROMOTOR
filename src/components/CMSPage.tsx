import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Calendar,
  Grid,
  MapPin,
  Radio,
  Upload,
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Check,
  Search,
  Download,
  Folder,
  RefreshCw,
  AlertCircle,
  Shield,
  Layers,
  FileSpreadsheet,
  Save,
  CheckCircle2,
  FileText,
  Rocket,
  CloudUpload,
  FileCheck,
  Camera,
  ExternalLink,
  Copy,
  CheckCheck,
  Eye,
  Activity,
  Wifi,
  Gauge,
  X
} from 'lucide-react';
import type { UserProfile, DatasetFolder, GridItem, BTSItem, POIItem, GridCategory, POIUpdateRecord, SpeedTestResult } from '../types';
import { TowerIcon } from './TelecomIcons';
import { getCategoryTheme } from '../utils/categoryTheme';
import {
  getRowProp,
  resolveSFGridCategory,
  cleanMarketShareValue,
  formatMSAbsolute,
  GRID_CATEGORY_KEYS,
  MS_SF_KEYS,
  MS_XLCO_KEYS,
  MS_TSEL_KEYS,
  MS_IOH_KEYS,
  MS_IM3_KEYS,
  MS_3TRI_KEYS,
  MS_XLS_KEYS
} from '../utils/telecomMetrics';
import { api } from '../services/api';
import * as XLSX from 'xlsx';
import { DeployGuideContent } from './DeployGuideContent';
import { GridEditModal } from './GridEditModal';
import { BTSEditModal } from './BTSEditModal';

interface CMSPageProps {
  user: UserProfile;
  onBackToMap: () => void;
  onDataUpdated: () => void;
  isDarkMode?: boolean;
}

type CMSTab = 'users' | 'date_folder' | 'grids' | 'pois' | 'poi_submissions' | 'bts' | 'network_dashboard' | 'upload_hub' | 'deploy_guide';

export const CMSPage: React.FC<CMSPageProps> = ({ user, onBackToMap, onDataUpdated, isDarkMode = true }) => {
  const [activeTab, setActiveTab] = useState<CMSTab>('users');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isReadOnly = user.role === 'NASIONAL_MANAGER';

  // --- STATE: USERS ---
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    role: 'PROMOTER' as 'ADMIN' | 'NASIONAL_MANAGER' | 'REGION' | 'CITY' | 'PROMOTER',
    scope: 'NASIONAL',
    password: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  });

  // --- STATE: FOLDERS & DATE ---
  const [folders, setFolders] = useState<DatasetFolder[]>([]);
  const [activeFolder, setActiveFolder] = useState<DatasetFolder | null>(null);
  const [editDateValue, setEditDateValue] = useState('');
  const [editPeriodValue, setEditPeriodValue] = useState('');
  const [isDateSaving, setIsDateSaving] = useState(false);
  const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState(false);
  const [folderFormData, setFolderFormData] = useState({
    name: '',
    description: '',
    region: 'EAST JAVA',
    city: 'KAB. BANGKALAN',
    dataDate: new Date().toISOString().split('T')[0],
    period: 'Q1 2026'
  });

  // --- STATE: GRIDS ---
  const [gridsList, setGridsList] = useState<GridItem[]>([]);
  const [gridSearch, setGridSearch] = useState('');
  const [gridCategoryFilter, setGridCategoryFilter] = useState('ALL');
  const [isAddGridModalOpen, setIsAddGridModalOpen] = useState(false);
  const [editingGrid, setEditingGrid] = useState<GridItem | null>(null);
  const [gridFormData, setGridFormData] = useState({
    id: '',
    region: 'EAST JAVA',
    province: 'JAWA TIMUR (4672)',
    city: 'KAB. BANGKALAN',
    kecamatan: 'Bangkalan',
    pop: 6500,
    tsel: '45%',
    xlco: '30%',
    ioh: '15%',
    sf: '10%',
    bts: 1,
    poi: 12,
    cat: '1st Priority Acquisition' as GridCategory,
    prom: 'MULTIBRAND' as 'MULTIBRAND' | 'SINGLEBRAND' | 'DIRECT' | 'HYBRID'
  });

  // --- STATE: POIS ---
  const [poisList, setPoisList] = useState<POIItem[]>([]);
  const [poiSearch, setPoiSearch] = useState('');
  const [isAddPoiModalOpen, setIsAddPoiModalOpen] = useState(false);
  const [editingPoi, setEditingPoi] = useState<POIItem | null>(null);
  const [poiFormData, setPoiFormData] = useState({
    'Meta Grid ID': '3526001000',
    REGION: 'EAST JAVA',
    PROVINCE: 'JAWA TIMUR (4672)',
    'XLS CITY': 'KAB. BANGKALAN',
    KECAMATAN: 'Bangkalan',
    POI_ID: '',
    POI_NAME_RAW: '',
    POI_NAME: '',
    TAXON_NAME_RAW: 'Traditional Market & Groceries',
    TAXON_NAME: 'Traditional Market',
    LATITUDE: -7.052,
    LONGITUDE: 112.742
  });

  // --- STATE: BTS ---
  const [btsList, setBtsList] = useState<BTSItem[]>([]);
  const [btsSearch, setBtsSearch] = useState('');
  const [editingBTS, setEditingBTS] = useState<BTSItem | null>(null);
  const [isBTSEditModalOpen, setIsBTSEditModalOpen] = useState(false);

  // --- STATE: BATCH UPLOAD (TAB 6) ---
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState<string>('');
  const [uploadMode, setUploadMode] = useState<'merge' | 'replace'>('merge');
  const [uploadAutoActivate, setUploadAutoActivate] = useState<boolean>(true);
  const [uploadDataType, setUploadDataType] = useState<'auto' | 'grid' | 'bts' | 'poi'>('auto');
  const [stagedFiles, setStagedFiles] = useState<{ file: File; type: 'bts' | 'grid' | 'poi'; records: any[] }[]>([]);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const uploadFileInputRef = useRef<HTMLInputElement>(null);

  // --- STATE: POI FORM SUBMISSIONS (KHUSUS ADMIN) ---
  const [poiLogsList, setPoiLogsList] = useState<POIUpdateRecord[]>([]);
  const [poiLogsSearch, setPoiLogsSearch] = useState('');
  const [poiLogsCategoryFilter, setPoiLogsCategoryFilter] = useState('ALL');
  const [poiLogsPromoterFilter, setPoiLogsPromoterFilter] = useState('ALL');
  const [activePhotoModal, setActivePhotoModal] = useState<string | null>(null);
  const [selectedPoiLogDetail, setSelectedPoiLogDetail] = useState<POIUpdateRecord | null>(null);
  const [copiedCoordId, setCopiedCoordId] = useState<string | null>(null);

  // --- STATE: NETWORK CHECK LOGS & DASHBOARD ---
  const [networkLogsList, setNetworkLogsList] = useState<SpeedTestResult[]>([]);
  const [networkSearch, setNetworkSearch] = useState('');
  const [networkFilterType, setNetworkFilterType] = useState('ALL');
  const [copiedNetCoordId, setCopiedNetCoordId] = useState<string | null>(null);

  // Initial Data Fetching
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [allUsers, allFolders, allGrids, allPOIs, allBTS, allPoiLogs, allNetworkLogs] = await Promise.all([
        api.getUsers().catch(() => []),
        api.getFolders().catch(() => []),
        api.getGrids({}).catch(() => []),
        api.getPOIs().catch(() => []),
        api.getBTS({}).catch(() => []),
        api.getPOILogs().catch(() => []),
        api.getSpeedTestLogs().catch(() => [])
      ]);

      setUsersList(allUsers);
      const cleanFolders = allFolders.filter(f => f.id !== 'folder-all' && !f.name.toLowerCase().includes('master gabungan'));
      setFolders(cleanFolders);
      setGridsList(allGrids);
      setPoisList(allPOIs);
      setBtsList(allBTS);
      setPoiLogsList(allPoiLogs);
      setNetworkLogsList(allNetworkLogs);

      const active = cleanFolders.find(f => f.isActive) || cleanFolders[0];
      if (active) {
        setActiveFolder(active);
        setEditDateValue(active.dataDate || new Date().toISOString().split('T')[0]);
        setEditPeriodValue(active.period || 'Q1 2026');
        if (!uploadTargetFolderId) {
          setUploadTargetFolderId(active.id);
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal memuat data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // --- USER MANAGEMENT HANDLERS ---
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserFormData({
      name: '',
      email: '',
      role: 'PROMOTER',
      scope: 'HARPA',
      password: '',
      status: 'ACTIVE'
    });
    setIsAddUserModalOpen(true);
  };

  const handleOpenEditUser = (u: UserProfile) => {
    setEditingUser(u);
    setUserFormData({
      name: u.name,
      email: u.email,
      role: u.role,
      scope: u.scope,
      password: '',
      status: u.status || 'ACTIVE'
    });
    setIsAddUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, userFormData);
        setFeedback({ type: 'success', message: `Data user '${userFormData.name}' berhasil diperbarui.` });
      } else {
        await api.createUser(userFormData);
        setFeedback({ type: 'success', message: `User baru '${userFormData.name}' dengan role ${userFormData.role} berhasil dibuat.` });
      }
      setIsAddUserModalOpen(false);
      const updatedUsers = await api.getUsers();
      setUsersList(updatedUsers);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal menyimpan user' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Yakin ingin menghapus user '${userName}'? Akses login akan langsung dicabut.`)) return;
    setLoading(true);
    try {
      await api.deleteUser(userId);
      setFeedback({ type: 'success', message: `User '${userName}' berhasil dihapus.` });
      setUsersList(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal menghapus user' });
    } finally {
      setLoading(false);
    }
  };

  // --- DATE & FOLDER HANDLERS ---
  const handleSaveDateAndPeriod = async () => {
    if (!activeFolder) return;
    setIsDateSaving(true);
    setFeedback(null);
    try {
      const updated = await api.updateFolder(activeFolder.id, {
        dataDate: editDateValue,
        period: editPeriodValue
      });
      setActiveFolder(updated);
      setFolders(prev => prev.map(f => f.id === updated.id ? updated : f));
      setFeedback({ type: 'success', message: `Tanggal rilis (${editDateValue}) dan periode (${editPeriodValue}) dataset berhasil diperbarui!` });
      onDataUpdated();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal memperbarui tanggal dataset' });
    } finally {
      setIsDateSaving(false);
    }
  };

  const handleActivateFolder = async (folderId: string) => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.activateFolder(folderId);
      const targetFolder = res.folder || folders.find(f => f.id === folderId);
      if (targetFolder) {
        setActiveFolder(targetFolder);
        setEditDateValue(targetFolder.dataDate || new Date().toISOString().split('T')[0]);
        setEditPeriodValue(targetFolder.period || 'Q1 2026');
      }
      setFolders(prev => prev.map(f => ({ ...f, isActive: f.id === folderId })));
      setFeedback({ type: 'success', message: `Dataset '${targetFolder?.name || folderId}' aktif sekarang.` });
      onDataUpdated();
      fetchAllData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal mengaktifkan folder' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderFormData.name.trim()) return;
    setLoading(true);
    try {
      const created = await api.createFolder(folderFormData);
      setFolders(prev => [created, ...prev]);
      setIsAddFolderModalOpen(false);
      setFeedback({ type: 'success', message: `Folder '${created.name}' berhasil dibuat.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal membuat folder' });
    } finally {
      setLoading(false);
    }
  };

  // --- GRID HANDLERS ---
  const handleOpenAddGrid = () => {
    setEditingGrid(null);
    setIsAddGridModalOpen(true);
  };

  const handleOpenEditGrid = (g: GridItem) => {
    setEditingGrid(g);
    setIsAddGridModalOpen(true);
  };

  const handleSaveGridFromModal = async (gridItem: GridItem) => {
    setLoading(true);
    setFeedback(null);
    try {
      if (editingGrid) {
        await api.updateGrid(editingGrid.id, gridItem);
        setFeedback({ type: 'success', message: `Data Grid '${gridItem.id}' berhasil diperbarui.` });
      } else {
        await api.createGrid(gridItem);
        setFeedback({ type: 'success', message: `Grid baru '${gridItem.id}' berhasil ditambahkan ke database.` });
      }
      setIsAddGridModalOpen(false);
      const updatedGrids = await api.getGrids({});
      setGridsList(updatedGrids);
      onDataUpdated();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal menyimpan Grid' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGrid = async (gridId: string) => {
    if (!confirm(`Hapus Grid ID '${gridId}' dari database?`)) return;
    setLoading(true);
    try {
      await api.deleteGrid(gridId);
      setFeedback({ type: 'success', message: `Grid '${gridId}' berhasil dihapus.` });
      setGridsList(prev => prev.filter(g => g.id !== gridId));
      onDataUpdated();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal menghapus grid' });
    } finally {
      setLoading(false);
    }
  };

  // --- POI HANDLERS ---
  const handleOpenAddPoi = () => {
    setEditingPoi(null);
    const newId = `POI-BKL-${String(poisList.length + 1).padStart(4, '0')}`;
    setPoiFormData({
      'Meta Grid ID': gridsList[0]?.id || '3526001000',
      REGION: activeFolder?.region || 'EAST JAVA',
      PROVINCE: 'JAWA TIMUR (4672)',
      'XLS CITY': activeFolder?.city || 'KAB. BANGKALAN',
      KECAMATAN: 'Bangkalan',
      POI_ID: newId,
      POI_NAME_RAW: '',
      POI_NAME: '',
      TAXON_NAME_RAW: 'Traditional Market & Groceries',
      TAXON_NAME: 'Traditional Market',
      LATITUDE: -7.045,
      LONGITUDE: 112.915
    });
    setIsAddPoiModalOpen(true);
  };

  const handleOpenEditPoi = (p: POIItem) => {
    setEditingPoi(p);
    setPoiFormData({
      'Meta Grid ID': p['Meta Grid ID'] || p.grid || '3526001000',
      REGION: p.REGION || p.region || 'EAST JAVA',
      PROVINCE: p.PROVINCE || p.province || 'JAWA TIMUR (4672)',
      'XLS CITY': p['XLS CITY'] || p.city || 'KAB. BANGKALAN',
      KECAMATAN: p.KECAMATAN || p.kec || 'Bangkalan',
      POI_ID: p.POI_ID || p.id,
      POI_NAME_RAW: p.POI_NAME_RAW || p.poi_name_raw || p.name || '',
      POI_NAME: p.POI_NAME || p.name || '',
      TAXON_NAME_RAW: p.TAXON_NAME_RAW || p.taxon_name_raw || p.type || 'Traditional Market',
      TAXON_NAME: p.TAXON_NAME || p.type || 'Traditional Market',
      LATITUDE: p.LATITUDE ?? p.lat ?? -7.052,
      LONGITUDE: p.LONGITUDE ?? p.lng ?? 112.742
    });
    setIsAddPoiModalOpen(true);
  };

  const handleSavePoi = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalPoiName = poiFormData.POI_NAME.trim() || poiFormData.POI_NAME_RAW.trim();
    if (!finalPoiName) return;
    setLoading(true);
    setFeedback(null);
    try {
      const finalPoiNameRaw = poiFormData.POI_NAME_RAW.trim() || finalPoiName;
      const payload: any = {
        ...poiFormData,
        POI_NAME: finalPoiName,
        POI_NAME_RAW: finalPoiNameRaw,
        id: poiFormData.POI_ID,
        name: finalPoiName,
        type: poiFormData.TAXON_NAME,
        city: poiFormData['XLS CITY'],
        kec: poiFormData.KECAMATAN,
        grid: poiFormData['Meta Grid ID'],
        lat: poiFormData.LATITUDE,
        lng: poiFormData.LONGITUDE
      };

      if (editingPoi) {
        await api.updatePOI(editingPoi.id || editingPoi.POI_ID, payload);
        setFeedback({ type: 'success', message: `POI '${finalPoiName}' berhasil diperbarui.` });
      } else {
        await api.createPOI(payload);
        setFeedback({ type: 'success', message: `POI baru '${finalPoiName}' berhasil ditambahkan ke database.` });
      }
      setIsAddPoiModalOpen(false);
      const updatedPOIs = await api.getPOIs();
      setPoisList(updatedPOIs);
      onDataUpdated();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal menyimpan POI' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePoi = async (poiId: string, poiName: string) => {
    if (!confirm(`Hapus POI '${poiName}'?`)) return;
    setLoading(true);
    try {
      await api.deletePOI(poiId);
      setFeedback({ type: 'success', message: `POI '${poiName}' berhasil dihapus.` });
      setPoisList(prev => prev.filter(p => p.id !== poiId));
      onDataUpdated();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal menghapus POI' });
    } finally {
      setLoading(false);
    }
  };

  // BTS Handlers
  const handleOpenEditBTS = (bts: BTSItem) => {
    setEditingBTS(bts);
    setIsBTSEditModalOpen(true);
  };

  const handleSaveBTS = async (btsToSave: BTSItem) => {
    try {
      setLoading(true);
      await api.updateBTS(btsToSave.id, btsToSave);
      setBtsList(prev => prev.map(b => b.id === btsToSave.id ? btsToSave : b));
      setFeedback({ type: 'success', message: `Data BTS '${btsToSave.sitename || btsToSave.id}' berhasil disimpan!` });
      onDataUpdated();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal menyimpan data BTS' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBTS = async (id: string, name: string) => {
    if (!confirm(`Hapus BTS '${name || id}' dari database?`)) return;
    try {
      setLoading(true);
      await api.deleteBTS(id);
      setBtsList(prev => prev.filter(b => b.id !== id));
      setFeedback({ type: 'success', message: `BTS '${name || id}' berhasil dihapus!` });
      onDataUpdated();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal menghapus BTS' });
    } finally {
      setLoading(false);
    }
  };

  const exportBTSData = () => {
    const rows = btsList.map((b) => ({
      id: b.id,
      sitename: b.sitename || b.name || `BTS #${b.id}`,
      'Aging (Month)': b['Aging (Month)'] ?? b.aging_month ?? 24,
      site_type: b.site_type || b.type || 'Macro',
      'Site Function': b['Site Function'] || b.func || 'Residential',
      Province: b.Province || b.province || 'JAWA TIMUR (4672)',
      City: b.City || b.city || 'KAB. BANGKALAN',
      Kecamatan: b.Kecamatan || b.kec || 'Bangkalan',
      latitude: b.latitude ?? b.lat ?? -7.054,
      ongitude: b.ongitude ?? b.longitude ?? b.lng ?? 112.742,
      Region: b.Region || b.region || 'EAST JAVA',
      GRID_META_ID: b.GRID_META_ID || b.grid || `GM-${b.id}`,
      'Rev.2026': b['Rev.2026'] ?? b.Rev_2026 ?? 45000000,
      'Revenue Flag': b['Revenue Flag'] || b.rev || 'Rev >40 Mn',
      'BSP Data': b['BSP Data'] || b.bsp_data || 'Smartfren Fiber Core',
      'Geometry WKT': b['Geometry WKT'] || b.Geometry_WKT || `POINT (${(b.ongitude ?? b.longitude ?? b.lng ?? 112.742).toFixed(6)} ${(b.latitude ?? b.lat ?? -7.054).toFixed(6)})`
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BTS_Master');
    XLSX.writeFile(wb, `BTS_Towers_Export_16Headers_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportPOIData = () => {
    const rows = poisList.map((p) => {
      const poiId = p.POI_ID || p.poi_id || p.id;
      const metaGridId = p['Meta Grid ID'] || p.grid || p.gridId || '3526001000';
      const region = p.REGION || p.region || 'EAST JAVA';
      const province = p.PROVINCE || p.province || 'JAWA TIMUR (4672)';
      const city = p['XLS CITY'] || p.city || 'KAB. BANGKALAN';
      const kecamatan = p.KECAMATAN || p.kec || p.kecamatan || 'Bangkalan';
      const poiNameRaw = p.POI_NAME_RAW || p.poi_name_raw || p.name;
      const poiName = p.POI_NAME || p.name;
      const taxonRaw = p.TAXON_NAME_RAW || p.taxon_name_raw || p.type || 'Traditional Market';
      const taxon = p.TAXON_NAME || p.type || taxonRaw;
      const lat = p.LATITUDE ?? p.lat ?? -7.052;
      const lng = p.LONGITUDE ?? p.lng ?? 112.742;

      return {
        'Meta Grid ID': metaGridId,
        REGION: region,
        PROVINCE: province,
        'XLS CITY': city,
        KECAMATAN: kecamatan,
        POI_ID: poiId,
        POI_NAME_RAW: poiNameRaw,
        POI_NAME: poiName,
        TAXON_NAME_RAW: taxonRaw,
        TAXON_NAME: taxon,
        LATITUDE: lat,
        LONGITUDE: lng
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'POI_Master');
    XLSX.writeFile(wb, `POI_Master_Export_12Headers_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Download Templates
  const downloadTemplate = (type: 'grid' | 'bts' | 'poi') => {
    let rows: any[] = [];
    let filename = '';

    if (type === 'grid') {
      filename = 'Template_GRID_Master_23Headers.xlsx';
      rows = [
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
          'MS_XLCo.': '12.2%',
          MS_SF: '0.0%',
          MS_IM3: '6.9%',
          MS_3TRI: '5.8%',
          MS_TSEL: '75.1%',
          MS_XLS: '12.2%',
          MS_IOH: '12.7%',
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
          'MS_XLCo.': '18.5%',
          MS_SF: '14.2%',
          MS_IM3: '10.1%',
          MS_3TRI: '7.3%',
          MS_TSEL: '49.9%',
          MS_XLS: '18.5%',
          MS_IOH: '17.4%',
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
    } else if (type === 'bts') {
      filename = 'Template_BTS_Tower.xlsx';
      rows = [
        {
          id: 'EJ-BKL-0001',
          sitename: 'BKL-SOC-001',
          'Aging (Month)': 24,
          site_type: 'Macro',
          'Site Function': 'Residential',
          Province: 'JAWA TIMUR (4672)',
          City: 'KAB. BANGKALAN',
          Kecamatan: 'Socah',
          latitude: -7.054,
          ongitude: 112.742,
          Region: 'EAST JAVA',
          GRID_META_ID: 'GM-3526001001',
          'Rev.2026': 45000000,
          'Revenue Flag': 'Rev >40 Mn',
          'BSP Data': 'Smartfren Fiber Core',
          'Geometry WKT': 'POINT (112.742000 -7.054000)'
        },
        {
          id: 'EJ-BKL-0002',
          sitename: 'BKL-BLE-002',
          'Aging (Month)': 36,
          site_type: 'Micro',
          'Site Function': 'Commercial',
          Province: 'JAWA TIMUR (4672)',
          City: 'KAB. BANGKALAN',
          Kecamatan: 'Blega',
          latitude: -7.135,
          ongitude: 113.085,
          Region: 'EAST JAVA',
          GRID_META_ID: 'GM-3526001002',
          'Rev.2026': 32500000,
          'Revenue Flag': 'Rev 30-40 Mn',
          'BSP Data': 'Telkom BSP Tier-1',
          'Geometry WKT': 'POINT (113.085000 -7.135000)'
        }
      ];
    } else {
      filename = 'Template_POI_Master_12Headers.xlsx';
      rows = [
        {
          'Meta Grid ID': '3526001000',
          REGION: 'EAST JAVA',
          PROVINCE: 'JAWA TIMUR (4672)',
          'XLS CITY': 'KAB. BANGKALAN',
          KECAMATAN: 'Socah',
          POI_ID: 'POI-BKL-0001',
          POI_NAME_RAW: 'PASAR TRADISIONAL SOCAH SENTRAL',
          POI_NAME: 'Pasar Tradisional Socah',
          TAXON_NAME_RAW: 'Traditional Market & Groceries',
          TAXON_NAME: 'Traditional Market',
          LATITUDE: -7.052,
          LONGITUDE: 112.74
        },
        {
          'Meta Grid ID': '3526001005',
          REGION: 'EAST JAVA',
          PROVINCE: 'JAWA TIMUR (4672)',
          'XLS CITY': 'KAB. BANGKALAN',
          KECAMATAN: 'Bangkalan',
          POI_ID: 'POI-BKL-0002',
          POI_NAME_RAW: 'OUTLET BERKAH CELL PUSAT',
          POI_NAME: 'Berkah Cell Bangkalan',
          TAXON_NAME_RAW: 'Outlet Smartphone & Voucher Pulsa',
          TAXON_NAME: 'Modern Outlet',
          LATITUDE: -7.043,
          LONGITUDE: 112.918
        }
      ];
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, filename);
  };

  // Helper to parse file into records for Tab 6 Batch Upload
  const parseBatchFile = async (file: File): Promise<{ file: File; type: 'bts' | 'grid' | 'poi'; records: any[] } | null> => {
    const buffer = await file.arrayBuffer();
    const fileName = file.name.toLowerCase();

    // Determine type
    let detectedType: 'bts' | 'grid' | 'poi' = 'grid';
    if (uploadDataType !== 'auto') {
      detectedType = uploadDataType;
    } else {
      if (fileName.includes('bts') || fileName.includes('tower') || fileName.includes('site') || fileName.includes('menara')) {
        detectedType = 'bts';
      } else if (fileName.includes('poi') || fileName.includes('point') || fileName.includes('outlet') || fileName.includes('pasar') || fileName.includes('toko')) {
        detectedType = 'poi';
      } else {
        detectedType = 'grid';
      }
    }

    if (fileName.endsWith('.json') || fileName.endsWith('.geojson')) {
      const text = new TextDecoder().decode(buffer);
      const json = JSON.parse(text);
      if (Array.isArray(json)) {
        return { file, type: detectedType, records: json };
      } else if (json.features && Array.isArray(json.features)) {
        const gridItems: GridItem[] = json.features.map((f: any, idx: number) => {
          const props = f.properties || {};
          const coords = f.geometry?.coordinates?.[0] || [];
          let south = -7.2, west = 112.7, north = -7.18, east = 112.72;
          if (coords.length >= 3) {
            const lngs = coords.map((c: any) => typeof c[0] === 'number' ? c[0] : parseFloat(c[0])).filter((n: number) => !isNaN(n));
            const lats = coords.map((c: any) => typeof c[1] === 'number' ? c[1] : parseFloat(c[1])).filter((n: number) => !isNaN(n));
            if (lngs.length > 0 && lats.length > 0) {
              west = Math.min(...lngs);
              east = Math.max(...lngs);
              south = Math.min(...lats);
              north = Math.max(...lats);
            }
          }

          const rawId = props.GRID_ID ?? props.grid_id ?? props.id ?? props['Grid ID'] ?? props['GRID ID'] ?? props.gridId ?? (1000 + idx);
          const id = String(rawId);

          const region = String(
            props.REGION ?? props.Region ?? props.region ?? props['Wilayah'] ?? props.wilayah ?? activeFolder?.region ?? 'NORTHERN SUMATRA'
          ).trim();
          const province = String(
            props.PROVINCE ?? props.Province ?? props.province ?? props['Provinsi'] ?? props.provinsi ?? activeFolder?.province ?? 'ACEH'
          ).trim();
          const city = String(
            props.CITY ?? props['City MSA'] ?? props['CITY MSA'] ?? props.City ?? props.city ?? props['Kota'] ?? props['Kota/Kab'] ?? activeFolder?.city ?? 'KOTA SABANG'
          ).trim();
          const kecamatan = String(
            props.KECAMATAN ?? props.Kecamatan ?? props.kecamatan ?? props.kec ?? 'SUKAKARYA'
          ).trim();

          const rawLat = props['Center Lat'] ?? props.center_lat ?? props.latitude ?? props.lat;
          const rawLng = props['Center Long'] ?? props.center_long ?? props.longitude ?? props.lng ?? props.ongitude;
          const centerLat = rawLat !== undefined && !isNaN(parseFloat(rawLat)) ? parseFloat(rawLat) : (south + north) / 2;
          const centerLng = rawLng !== undefined && !isNaN(parseFloat(rawLng)) ? parseFloat(rawLng) : (west + east) / 2;

          const rawPop = getRowProp(props, ['POPULATION', 'Population', 'population', 'pop', 'Populasi']);
          const pop = typeof rawPop === 'number'
            ? rawPop
            : (parseInt(String(rawPop || '').replace(/[^0-9]/g, '')) || 5000);

          const rawBts = getRowProp(props, ['TOTAL_BTS', 'BTS', 'bts', 'total_bts']);
          const bts = typeof rawBts === 'number' ? rawBts : (parseInt(String(rawBts || '0')) || 0);

          const rawPoi = getRowProp(props, ['TOTAL_POI', 'POI', 'poi', 'total_poi']);
          const poi = typeof rawPoi === 'number' ? rawPoi : (parseInt(String(rawPoi || '0')) || 0);

          // Extract MS values
          const rawSF = getRowProp(props, MS_SF_KEYS);
          const rawXLCo = getRowProp(props, MS_XLCO_KEYS);
          const rawTSEL = getRowProp(props, MS_TSEL_KEYS);
          const rawIOH = getRowProp(props, MS_IOH_KEYS);
          const rawIM3 = getRowProp(props, MS_IM3_KEYS);
          const raw3TRI = getRowProp(props, MS_3TRI_KEYS);
          const rawXLS = getRowProp(props, MS_XLS_KEYS);

          const msSF = cleanMarketShareValue(rawSF, '0');
          const msXLCo = cleanMarketShareValue(rawXLCo, '0');
          const msTSEL = cleanMarketShareValue(rawTSEL, '0');
          const msIOH = cleanMarketShareValue(rawIOH, '0');
          const msIM3 = cleanMarketShareValue(rawIM3, '0');
          const ms3TRI = cleanMarketShareValue(raw3TRI, '0');
          const msXLS = cleanMarketShareValue(rawXLS, '0');

          // Robust Category mapping supporting any SF Category variation
          const rawCat = getRowProp(props, GRID_CATEGORY_KEYS);
          const category: GridCategory = resolveSFGridCategory(rawCat, rawSF);

          let revNum = 0;
          const rawRev = getRowProp(props, ['Rev_August_2026', 'rev_august_2026', 'revenue', 'rev', 'Revenue']);
          if (typeof rawRev === 'number') {
            revNum = rawRev;
          } else if (rawRev) {
            revNum = parseFloat(String(rawRev).replace(/[^0-9.-]+/g, '')) || 0;
          } else {
            revNum = category === '1st Priority Acquisition' ? 46500000 : (category === '2nd Priority Acquisition' ? 33500000 : 18000000);
          }

          let revFlag = String(props.Revenue_Flag ?? props['Revenue Flag'] ?? props.revenue_flag ?? '');
          if (!revFlag || revFlag === 'Unknown') {
            if (revNum >= 40000000) revFlag = 'Rev >40 Mn';
            else if (revNum >= 30000000) revFlag = 'Rev 30-40 Mn';
            else if (revNum >= 20000000) revFlag = 'Rev 20-30 Mn';
            else if (revNum > 0) revFlag = 'Rev <20 Mn';
            else revFlag = 'Rev 0';
          }

          let wkt = String(props.Geometry_WKT ?? props['Geometry_WKT'] ?? props['Geometry WKT'] ?? props.wkt ?? '');
          if (!wkt || !wkt.toLowerCase().includes('polygon')) {
            if (coords.length >= 3) {
              const coordStr = coords.map((c: any) => `${c[0]} ${c[1]}`).join(', ');
              wkt = `POLYGON ((${coordStr}))`;
            } else {
              wkt = `POLYGON ((${west} ${south}, ${east} ${south}, ${east} ${north}, ${west} ${north}, ${west} ${south}))`;
            }
          }

          const sitename = String(props.sitename ?? props['Nama Site'] ?? props.name ?? `${kecamatan} Grid ${id.slice(-4)}`);
          const site_type = String(props.site_type ?? props['Tipe Site'] ?? (category === '1st Priority Acquisition' ? 'Macro' : 'Micro'));
          const metaId = String(props.GRID_META_ID ?? props['Grid Meta ID'] ?? `GM-${id}`);
          const deviceStatus = String(props.Device_Status ?? props['Device_Status'] ?? props.status ?? 'Active');
          const prom = String(props['Mapping Promotor'] ?? props.prom ?? 'MULTIBRAND');

          const speedXL = getRowProp(props, ['P10_DL_Speed_XLCo', 'Download_Speed_XLCo', 'speed_xlco']);
          const speedSF = getRowProp(props, ['P10_DL_Speed_SF', 'Download_Speed_SF', 'speed_sf']);
          const p10XLCo = speedXL ? String(speedXL) : '> 3Mb';
          const p10SF = speedSF ? String(speedSF) : (category === '1st Priority Acquisition' ? '< 3Mb' : '> 3Mb');

          const rawBtsRes = getRowProp(props, ['TOTAL_BTS_RESIDENTIAL', 'BTS_RESIDENTIAL', 'total_bts_residential']);
          const btsResidential = bts === 0 ? 0 : (rawBtsRes !== undefined ? (parseInt(String(rawBtsRes)) || 0) : Math.max(0, Math.floor(bts * 0.75)));

          return {
            // 23 Standard Database Headers
            GRID_ID: id,
            REGION: region,
            PROVINCE: province,
            CITY: city,
            KECAMATAN: kecamatan,
            'SF Grid Category': category,
            'Mapping Promotor': prom,
            'Center Long': Number(centerLng.toFixed(6)),
            'Center Lat': Number(centerLat.toFixed(6)),
            'Geometry WKT': wkt,
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

            id,
            sitename,
            site_type,
            Province: province,
            City: city,
            Kecamatan: kecamatan,
            Region: region,
            latitude: Number(centerLat.toFixed(6)),
            longitude: Number(centerLng.toFixed(6)),
            GRID_META_ID: metaId,
            Rev_August_2026: revNum,
            Revenue_Flag: revFlag as any,
            SF_Grid_Category: category,
            Geometry_WKT: wkt,
            Device_Status: deviceStatus,

            // Aliases for compatibility
            region,
            province,
            city,
            kecamatan,
            pop,
            tsel: msTSEL,
            xlco: msXLCo,
            xl: msXLS,
            ioh: msIOH,
            sf: msSF,
            bts,
            poi,
            cat: category,
            prom: prom as any,
            bounds: [[south, west], [north, east]],
            center: [Number(centerLat.toFixed(6)), Number(centerLng.toFixed(6))]
          };
        });
        return { file, type: 'grid', records: gridItems };
      }
      return null;
    } else {
      // Excel / CSV: Use raw: false and defval: '' to preserve formatted percentage cells and avoid missing columns
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const rawJson: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false, defval: '' });

      if (rawJson.length === 0) return null;

      // Smart column inspection if uploadDataType was auto
      if (uploadDataType === 'auto') {
        const firstRowKeys = Object.keys(rawJson[0]).map(k => k.toLowerCase());
        if (firstRowKeys.some(k => k.includes('bts') || k.includes('tower') || k.includes('tenants') || k.includes('height') || k.includes('revenue flag'))) {
          detectedType = 'bts';
        } else if (firstRowKeys.some(k => k.includes('poi') || k.includes('outlet') || (k.includes('tipe') && !firstRowKeys.some(x => x.includes('bts'))))) {
          detectedType = 'poi';
        } else if (firstRowKeys.some(k => k.includes('grid') || k.includes('populasi') || k.includes('tsel') || k.includes('xlco') || k.includes('sf'))) {
          detectedType = 'grid';
        }
      }

      if (detectedType === 'bts') {
        const btsItems: BTSItem[] = rawJson.map((row, idx) => {
          const lat = parseFloat(row['latitude'] ?? row['Latitude'] ?? row['LATITUDE'] ?? row.lat ?? row.Lat ?? row.LAT) || -7.054;
          const lng = parseFloat(row['longitude'] ?? row['Longitude'] ?? row['LONGITUDE'] ?? row['ongitude'] ?? row['Ongitude'] ?? row.lng ?? row.Lng ?? row.LNG ?? row.lon ?? row.Lon) || 112.742;
          const id = String(row['id'] ?? row['ID BTS'] ?? row['ID'] ?? row.id ?? `EJ-BKL-${String(idx + 1).padStart(4, '0')}`);
          const sitename = String(row['sitename'] ?? row['Nama BTS'] ?? row['Nama'] ?? row.name ?? `Tower ${idx + 1}`);
          const agingRaw = row['Aging (Month)'] ?? row['aging_month'] ?? row['Aging'] ?? 24;
          const aging = typeof agingRaw === 'number' ? agingRaw : (parseInt(String(agingRaw)) || 24);
          const siteType = String(row['site_type'] ?? row['Tipe'] ?? row.type ?? 'Macro');
          const siteFunc = String(row['Site Function'] ?? row['Fungsi'] ?? row.func ?? 'Residential');
          const province = String(row['Province'] ?? row['Provinsi'] ?? row.province ?? 'JAWA TIMUR (4672)');
          const city = String(row['City'] ?? row['Kota'] ?? row.city ?? activeFolder?.city ?? 'KAB. BANGKALAN');
          const kecamatan = String(row['Kecamatan'] ?? row.kec ?? 'Bangkalan');
          const region = String(row['Region'] ?? row.region ?? activeFolder?.region ?? 'EAST JAVA');
          const metaId = String(row['GRID_META_ID'] ?? row['Grid ID'] ?? row.grid ?? `GM-${id}`);

          const rawRev = row['Rev.2026'] ?? row['Rev_2026'] ?? row['Rev 2026'] ?? row['Revenue'] ?? row.rev;
          let revNum = 0;
          if (typeof rawRev === 'number') {
            revNum = rawRev;
          } else if (typeof rawRev === 'string') {
            const parsed = parseFloat(rawRev.replace(/[^0-9.-]+/g, ''));
            revNum = isNaN(parsed) ? 42000000 : (parsed < 1000 ? parsed * 1000000 : parsed);
          } else {
            revNum = 42000000;
          }

          let revFlag = String(row['Revenue Flag'] ?? row['Revenue_Flag'] ?? row.rev ?? '');
          if (!revFlag || revFlag === 'Unknown') {
            if (revNum >= 40000000) revFlag = 'Rev >40 Mn';
            else if (revNum >= 30000000) revFlag = 'Rev 30-40 Mn';
            else if (revNum >= 20000000) revFlag = 'Rev 20-30 Mn';
            else if (revNum > 0) revFlag = 'Rev <20 Mn';
            else revFlag = 'Rev 0';
          }

          const bsp = String(row['BSP Data'] ?? row['bsp_data'] ?? row['BSP'] ?? 'Smartfren Fiber Core');
          const defaultWkt = `POINT (${lng.toFixed(6)} ${lat.toFixed(6)})`;
          const wkt = String(row['Geometry WKT'] ?? row['Geometry_WKT'] ?? row['WKT'] ?? defaultWkt);

          return {
            id,
            sitename,
            'Aging (Month)': aging,
            site_type: siteType,
            'Site Function': siteFunc,
            Province: province,
            City: city,
            Kecamatan: kecamatan,
            latitude: lat,
            ongitude: lng,
            Region: region,
            GRID_META_ID: metaId,
            'Rev.2026': revNum,
            'Revenue Flag': revFlag as any,
            'BSP Data': bsp,
            'Geometry WKT': wkt
          } as any;
        });
        return { file, type: 'bts', records: btsItems };
      } else if (detectedType === 'poi') {
        const poiItems: POIItem[] = rawJson.map((row, idx) => {
          const poiId = String(row.POI_ID || row['POI_ID'] || row['ID POI'] || row.id || `POI-BKL-${String(idx + 1).padStart(4, '0')}`);
          const region = String(row.REGION || row['REGION'] || row.Region || row.region || activeFolder?.region || 'EAST JAVA');
          const province = String(row.PROVINCE || row['PROVINCE'] || row.Province || row.province || 'JAWA TIMUR (4672)');
          const city = String(row['XLS CITY'] || row['XLS_CITY'] || row['Kota'] || row.city || activeFolder?.city || 'KAB. BANGKALAN');
          const kecamatan = String(row.KECAMATAN || row['KECAMATAN'] || row.Kecamatan || row.kec || 'Bangkalan');
          const metaGridId = String(row['Meta Grid ID'] || row['META_GRID_ID'] || row['Grid ID'] || row.grid || '3526001000');
          const poiNameRaw = String(row.POI_NAME_RAW || row['POI_NAME_RAW'] || row['Nama POI Raw'] || row.name || `POI #${idx + 1}`);
          const poiName = String(row.POI_NAME || row['POI_NAME'] || row['Nama POI'] || row.name || poiNameRaw);
          const combinedTaxon = row['TAXON_NAME_RAW TAXON_NAME'] || row['TAXON_NAME_RAW_TAXON_NAME'] || '';
          const taxonRaw = String(row.TAXON_NAME_RAW || row['TAXON_NAME_RAW'] || (combinedTaxon ? combinedTaxon.split(' ')[0] : '') || row['Tipe'] || row.type || 'Traditional Market');
          const taxon = String(row.TAXON_NAME || row['TAXON_NAME'] || combinedTaxon || taxonRaw || row['Tipe'] || row.type || 'Traditional Market');
          const lat = parseFloat(row.LATITUDE || row['LATITUDE'] || row['Latitude'] || row.lat) || -7.052;
          const lng = parseFloat(row.LONGITUDE || row['LONGITUDE'] || row['Longitude'] || row.lng) || 112.742;

          return {
            'Meta Grid ID': metaGridId,
            REGION: region,
            PROVINCE: province,
            'XLS CITY': city,
            KECAMATAN: kecamatan,
            POI_ID: poiId,
            POI_NAME_RAW: poiNameRaw,
            POI_NAME: poiName,
            TAXON_NAME_RAW: taxonRaw,
            TAXON_NAME: taxon,
            LATITUDE: lat,
            LONGITUDE: lng,

            'TAXON_NAME_RAW TAXON_NAME': `${taxonRaw} ${taxon}`.trim(),

            id: poiId,
            name: poiName,
            type: taxon,
            city,
            kec: kecamatan,
            kecamatan,
            region,
            province,
            grid: metaGridId,
            gridId: metaGridId,
            lat,
            lng,
            latitude: lat,
            longitude: lng,
            poi_id: poiId,
            poi_name: poiName,
            poi_name_raw: poiNameRaw,
            taxon_name: taxon,
            taxon_name_raw: taxonRaw
          };
        });
        return { file, type: 'poi', records: poiItems };
      } else {
        const gridItems: GridItem[] = rawJson.map((row, idx) => {
          const rawId = getRowProp(row, ['GRID_ID', 'GRID ID', 'Grid ID', 'id', 'Grid_ID', 'GridId']) ?? `352600${1000 + idx}`;
          const id = String(rawId);

          const rawLat = getRowProp(row, ['Center Lat', 'Center_Lat', 'latitude', 'Latitude', 'LATITUDE', 'lat', 'CenterLat']);
          const rawLng = getRowProp(row, ['Center Long', 'Center_Long', 'longitude', 'Longitude', 'LONGITUDE', 'lng', 'ongitude', 'CenterLong']);
          const lat = parseFloat(rawLat) || -7.05;
          const lng = parseFloat(rawLng) || 112.9;
          const step = 0.022;

          const province = String(getRowProp(row, ['PROVINCE', 'Province', 'Provinsi', 'province']) || 'JAWA TIMUR (4672)');
          const city = String(getRowProp(row, ['CITY', 'City', 'City MSA', 'Kota', 'Kota/Kab', 'city']) || activeFolder?.city || 'KAB. BANGKALAN');
          const kecamatan = String(getRowProp(row, ['KECAMATAN', 'Kecamatan', 'kecamatan', 'kec']) || 'Bangkalan');
          const region = String(getRowProp(row, ['REGION', 'Region', 'region', 'Wilayah']) || activeFolder?.region || 'EAST JAVA');
          const metaId = String(getRowProp(row, ['GRID_META_ID', 'Grid Meta ID', 'GRID META ID', 'metaId']) || `GM-${id}`);
          const sitename = String(getRowProp(row, ['sitename', 'Sitename', 'Nama Grid', 'Nama Site', 'Site Name', 'name']) || `${kecamatan} Grid ${id.slice(-4)}`);
          const site_type = String(getRowProp(row, ['site_type', 'Site Type', 'Tipe Site', 'Tipe']) || 'Macro');

          // Extract MS values faithfully without overwriting 0 or falsy values
          const rawSF = getRowProp(row, MS_SF_KEYS);
          const rawXLCo = getRowProp(row, MS_XLCO_KEYS);
          const rawTSEL = getRowProp(row, MS_TSEL_KEYS);
          const rawIOH = getRowProp(row, MS_IOH_KEYS);
          const rawIM3 = getRowProp(row, MS_IM3_KEYS);
          const raw3TRI = getRowProp(row, MS_3TRI_KEYS);
          const rawXLS = getRowProp(row, MS_XLS_KEYS);

          const msSF = cleanMarketShareValue(rawSF, '0');
          const msXLCo = cleanMarketShareValue(rawXLCo, '0');
          const msTSEL = cleanMarketShareValue(rawTSEL, '0');
          const msIOH = cleanMarketShareValue(rawIOH, '0');
          const msIM3 = cleanMarketShareValue(rawIM3, '0');
          const ms3TRI = cleanMarketShareValue(raw3TRI, '0');
          const msXLS = cleanMarketShareValue(rawXLS, '0');

          // Robust Category mapping supporting any column name and value format
          const rawCat = getRowProp(row, GRID_CATEGORY_KEYS);
          const category: GridCategory = resolveSFGridCategory(rawCat, rawSF);

          const rawRev = getRowProp(row, ['Rev_August_2026', 'rev_august_2026', 'Revenue', 'revenue', 'Rev', 'rev']);
          const revNum = typeof rawRev === 'number' ? rawRev : (parseFloat(String(rawRev || '').replace(/[^0-9.-]+/g, '')) || (
            category === '1st Priority Acquisition' ? 46500000 : (category === '2nd Priority Acquisition' ? 33500000 : 18000000)
          ));

          let revFlag = String(getRowProp(row, ['Revenue_Flag', 'Revenue Flag', 'revenue_flag', 'rev']) || '');
          if (!revFlag || revFlag === 'Unknown') {
            if (revNum >= 40000000) revFlag = 'Rev >40 Mn';
            else if (revNum >= 30000000) revFlag = 'Rev 30-40 Mn';
            else if (revNum >= 20000000) revFlag = 'Rev 20-30 Mn';
            else if (revNum > 0) revFlag = 'Rev <20 Mn';
            else revFlag = 'Rev 0';
          }

          const defaultWkt = `POLYGON ((${Number((lng - step / 2).toFixed(6))} ${Number((lat - step / 2).toFixed(6))}, ${Number((lng + step / 2).toFixed(6))} ${Number((lat - step / 2).toFixed(6))}, ${Number((lng + step / 2).toFixed(6))} ${Number((lat + step / 2).toFixed(6))}, ${Number((lng - step / 2).toFixed(6))} ${Number((lat + step / 2).toFixed(6))}, ${Number((lng - step / 2).toFixed(6))} ${Number((lat - step / 2).toFixed(6))}))`;
          const wkt = String(getRowProp(row, ['Geometry_WKT', 'Geometry WKT', 'Geometry_wkt', 'WKT', 'wkt']) || defaultWkt);
          const deviceStatus = String(getRowProp(row, ['Device_Status', 'Device Status', 'Status', 'status']) || 'Active');

          const rawPop = getRowProp(row, ['POPULATION', 'Population', 'population', 'Populasi', 'pop']);
          const pop = typeof rawPop === 'number' ? rawPop : (parseInt(String(rawPop || '').replace(/[^0-9]/g, '')) || 5000);

          const rawBts = getRowProp(row, ['TOTAL_BTS', 'BTS', 'bts', 'total_bts']);
          const totalBts = typeof rawBts === 'number' ? rawBts : (parseInt(String(rawBts || '0')) || 0);

          const rawBtsRes = getRowProp(row, ['TOTAL_BTS_RESIDENTIAL', 'BTS_RESIDENTIAL', 'total_bts_residential']);
          const totalBtsRes = totalBts === 0 ? 0 : (rawBtsRes !== undefined ? (parseInt(String(rawBtsRes)) || 0) : Math.max(0, Math.floor(totalBts * 0.75)));

          const rawPoi = getRowProp(row, ['TOTAL_POI', 'POI', 'poi', 'total_poi']);
          const totalPoi = typeof rawPoi === 'number' ? rawPoi : (parseInt(String(rawPoi || '0')) || 0);

          const promotor = String(getRowProp(row, ['Mapping Promotor', 'Mapping_Promotor', 'Promotor', 'prom']) || 'MULTIBRAND');

          const speedXL = getRowProp(row, ['P10_DL_Speed_XLCo', 'Download_Speed_XLCo', 'speed_xlco']);
          const speedSF = getRowProp(row, ['P10_DL_Speed_SF', 'Download_Speed_SF', 'speed_sf']);
          const p10XLCo = speedXL ? String(speedXL) : '> 3Mb';
          const p10SF = speedSF ? String(speedSF) : (category === '1st Priority Acquisition' ? '< 3Mb' : '> 3Mb');

          return {
            // 23 Exact database headers requested by user:
            GRID_ID: id,
            REGION: region,
            PROVINCE: province,
            CITY: city,
            KECAMATAN: kecamatan,
            'SF Grid Category': category,
            'Mapping Promotor': promotor,
            'Center Long': Number(lng.toFixed(6)),
            'Center Lat': Number(lat.toFixed(6)),
            'Geometry WKT': wkt,
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
            TOTAL_POI: totalPoi,
            TOTAL_BTS: totalBts,
            TOTAL_BTS_RESIDENTIAL: totalBtsRes,

            // Compatibility aliases
            id,
            sitename,
            site_type,
            Province: province,
            City: city,
            Kecamatan: kecamatan,
            Region: region,
            latitude: Number(lat.toFixed(6)),
            longitude: Number(lng.toFixed(6)),
            GRID_META_ID: metaId,
            Rev_August_2026: revNum,
            Revenue_Flag: revFlag as any,
            SF_Grid_Category: category,
            Geometry_WKT: wkt,
            Device_Status: deviceStatus,

            region,
            province,
            city,
            kecamatan,
            pop,
            tsel: msTSEL,
            xlco: msXLCo,
            xl: msXLS,
            ioh: msIOH,
            sf: msSF,
            bts: totalBts,
            poi: totalPoi,
            cat: category,
            prom: promotor as any,
            bounds: [[lat - step / 2, lng - step / 2], [lat + step / 2, lng + step / 2]],
            center: [lat, lng]
          };
        });
        return { file, type: 'grid', records: gridItems };
      }
    }
  };

  const handleBatchFiles = async (filesList: FileList | File[] | null) => {
    if (!filesList || filesList.length === 0) return;
    setIsProcessingFiles(true);
    setFeedback(null);

    const validExtensions = ['.xlsx', '.xls', '.csv', '.json', '.geojson'];
    const newParsedList: { file: File; type: 'bts' | 'grid' | 'poi'; records: any[] }[] = [];

    for (let i = 0; i < filesList.length; i++) {
      const f = filesList[i];
      const hasValidExt = validExtensions.some((ext) => f.name.toLowerCase().endsWith(ext));
      if (!hasValidExt) continue;

      try {
        const parsed = await parseBatchFile(f);
        if (parsed && parsed.records.length > 0) {
          newParsedList.push(parsed);
        }
      } catch (err: any) {
        console.error(`Gagal parsing berkas ${f.name}:`, err);
      }
    }

    setIsProcessingFiles(false);
    if (newParsedList.length === 0) {
      setFeedback({ type: 'error', message: 'Tidak ada file dengan format valid (.xlsx, .csv, .geojson) yang dapat dibaca.' });
    } else {
      setStagedFiles((prev) => [...prev, ...newParsedList]);
      const totalRecs = newParsedList.reduce((acc, cur) => acc + cur.records.length, 0);
      setFeedback({
        type: 'success',
        message: `${newParsedList.length} berkas berhasil dibaca (${totalRecs} baris data siap diunggah ke database)`
      });
    }
  };

  const handleExecuteBatchUpload = async () => {
    const targetId = uploadTargetFolderId || activeFolder?.id || folders[0]?.id;
    if (!targetId) {
      setFeedback({ type: 'error', message: 'Silakan pilih folder tujuan penyimpanan terlebih dahulu' });
      return;
    }
    if (stagedFiles.length === 0) {
      setFeedback({ type: 'error', message: 'Silakan pilih atau seret berkas terlebih dahulu untuk diunggah' });
      return;
    }

    setIsUploading(true);
    setUploadProgressText('Mempersiapkan data upload...');
    setFeedback(null);

    try {
      let totalRecords = 0;
      for (let i = 0; i < stagedFiles.length; i++) {
        const item = stagedFiles[i];
        const res = await api.uploadToFolder(
          targetId,
          {
            type: item.type,
            records: item.records,
            fileName: item.file.name,
            mode: uploadMode,
            activate: uploadAutoActivate
          },
          (uploaded, total, percent) => {
            setUploadProgressText(
              `Mengunggah ${item.file.name} (${uploaded.toLocaleString()} / ${total.toLocaleString()} baris • ${percent}%)`
            );
          }
        );
        totalRecords += res.count;
      }

      setUploadProgressText('Menyinkronkan data peta & analytics...');
      await fetchAllData();
      onDataUpdated();
      setStagedFiles([]);
      const targetFolderObj = folders.find(f => f.id === targetId);
      setFeedback({
        type: 'success',
        message: `Berhasil mengunggah & menyinkronkan ${totalRecords.toLocaleString()} baris data ke folder '${targetFolderObj?.name || 'Dataset'}'!`
      });
    } catch (err: any) {
      console.error('Batch upload error:', err);
      setFeedback({ type: 'error', message: err.message || 'Gagal mengunggah data' });
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
    }
  };

  // Filtered views
  const filteredUsers = usersList.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.scope.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredGrids = gridsList.filter(g => {
    const q = gridSearch.toLowerCase();
    const matchSearch =
      (g.id || '').toLowerCase().includes(q) ||
      (g.sitename || '').toLowerCase().includes(q) ||
      (g.GRID_META_ID || '').toLowerCase().includes(q) ||
      (g.Kecamatan || g.kecamatan || '').toLowerCase().includes(q) ||
      (g.City || g.city || '').toLowerCase().includes(q) ||
      (g.Device_Status || '').toLowerCase().includes(q);
    const category = g['SF Grid Category'] || g.SF_Grid_Category || g.cat || 'Avoid Cannibalism';
    const matchCat = gridCategoryFilter === 'ALL' || category === gridCategoryFilter;
    return matchSearch && matchCat;
  });

  const filteredPois = poisList.filter(p => {
    const q = poiSearch.toLowerCase();
    const id = (p.POI_ID || p.poi_id || p.id || '').toLowerCase();
    const name = (p.POI_NAME || p.poi_name || p.name || '').toLowerCase();
    const nameRaw = (p.POI_NAME_RAW || p.poi_name_raw || '').toLowerCase();
    const taxon = (p.TAXON_NAME || p.taxon_name || p.type || '').toLowerCase();
    const taxonRaw = (p.TAXON_NAME_RAW || p.taxon_name_raw || '').toLowerCase();
    const kec = (p.KECAMATAN || p.kec || p.kecamatan || '').toLowerCase();
    const city = (p['XLS CITY'] || p.city || '').toLowerCase();
    const grid = (p['Meta Grid ID'] || p.grid || p.gridId || '').toLowerCase();
    return (
      id.includes(q) ||
      name.includes(q) ||
      nameRaw.includes(q) ||
      taxon.includes(q) ||
      taxonRaw.includes(q) ||
      kec.includes(q) ||
      city.includes(q) ||
      grid.includes(q)
    );
  });

  // --- POI FORM SUBMISSION HANDLERS & COMPUTED FILTERS (KHUSUS ADMIN) ---
  const handleDeletePoiLog = async (id: string) => {
    if (user.role !== 'ADMIN') {
      setFeedback({ type: 'error', message: 'Hanya Admin yang berhak menghapus data formulir POI!' });
      return;
    }
    if (!confirm('Apakah Anda yakin ingin menghapus data laporan POI ini?')) return;
    try {
      const ok = await api.deletePOILog(id);
      if (ok) {
        setPoiLogsList((prev) => prev.filter((p) => p.id !== id));
        if (selectedPoiLogDetail?.id === id) {
          setSelectedPoiLogDetail(null);
        }
        setFeedback({ type: 'success', message: 'Data formulir POI berhasil dihapus.' });
      } else {
        setFeedback({ type: 'error', message: 'Gagal menghapus data POI dari server.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal menghapus data formulir POI' });
    }
  };

  const handleCopyCoordinates = (id: string, lat: number, lng: number) => {
    navigator.clipboard.writeText(`${lat}, ${lng}`);
    setCopiedCoordId(id);
    setTimeout(() => setCopiedCoordId(null), 2000);
  };

  const handleExportPoiLogs = () => {
    if (filteredPoiLogs.length === 0) {
      alert('Tidak ada data POI untuk diekspor.');
      return;
    }
    const exportData = filteredPoiLogs.map((log, idx) => ({
      No: idx + 1,
      ID: log.id,
      'Waktu Pengisian': new Date(log.createdAt).toLocaleString('id-ID'),
      'Nama Promotor': log.promoterName,
      'Email Promotor': log.promoterEmail,
      'Nama Outlet / POI': log.poiName || '-',
      'Kategori POI': log.poiCategory || '-',
      'Latitude': log.location.lat,
      'Longitude': log.location.lng,
      'Akurasi GPS (meter)': log.location.accuracy || '-',
      'Grid ID': log.gridId || '-',
      'Catatan / Notes': log.notes || '-',
      'Jumlah Foto Terlampir': log.photos?.length || 0
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'POI_Terisi_Promotor');
    XLSX.writeFile(wb, `Data_POI_Terisi_Promotor_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleRefreshPoiLogs = async () => {
    setLoading(true);
    try {
      const logs = await api.getPOILogs();
      setPoiLogsList(logs);
      setFeedback({ type: 'success', message: `Berhasil memuat ${logs.length} data POI terisi.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal merefresh data POI terisi' });
    } finally {
      setLoading(false);
    }
  };

  // Filtered POI Form Submissions
  const filteredPoiLogs = poiLogsList.filter((log) => {
    if (poiLogsCategoryFilter !== 'ALL' && log.poiCategory !== poiLogsCategoryFilter) {
      return false;
    }
    if (poiLogsPromoterFilter !== 'ALL' && log.promoterName !== poiLogsPromoterFilter) {
      return false;
    }
    if (poiLogsSearch.trim()) {
      const q = poiLogsSearch.toLowerCase();
      const matchName = (log.poiName || '').toLowerCase().includes(q);
      const matchPromoter = (log.promoterName || '').toLowerCase().includes(q);
      const matchEmail = (log.promoterEmail || '').toLowerCase().includes(q);
      const matchNotes = (log.notes || '').toLowerCase().includes(q);
      const matchCategory = (log.poiCategory || '').toLowerCase().includes(q);
      const matchGrid = (log.gridId || '').toLowerCase().includes(q);
      return matchName || matchPromoter || matchEmail || matchNotes || matchCategory || matchGrid;
    }
    return true;
  });

  const uniquePoiCategories = Array.from(
    new Set(poiLogsList.map((l) => l.poiCategory).filter(Boolean))
  ) as string[];

  const uniquePoiPromoters = Array.from(
    new Set(poiLogsList.map((l) => l.promoterName).filter(Boolean))
  ) as string[];

  const totalPhotosCount = poiLogsList.reduce(
    (acc, cur) => acc + (cur.photos ? cur.photos.length : 0),
    0
  );

  // --- NETWORK CHECK HANDLERS & COMPUTED METRICS ---
  const handleDeleteNetworkLog = async (id: string) => {
    if (user.role !== 'ADMIN') {
      setFeedback({ type: 'error', message: 'Hanya Admin yang berhak menghapus data log uji jaringan!' });
      return;
    }
    if (!confirm('Apakah Anda yakin ingin menghapus catatan hasil tes jaringan ini?')) return;
    try {
      const ok = await api.deleteSpeedTestLog(id);
      if (ok) {
        setNetworkLogsList((prev) => prev.filter((n) => n.id !== id));
        setFeedback({ type: 'success', message: 'Catatan hasil uji jaringan berhasil dihapus.' });
      } else {
        setFeedback({ type: 'error', message: 'Gagal menghapus log uji jaringan dari server.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal menghapus log uji jaringan' });
    }
  };

  const handleCopyNetCoordinates = (id: string, lat: number, lng: number) => {
    navigator.clipboard.writeText(`${lat}, ${lng}`);
    setCopiedNetCoordId(id);
    setTimeout(() => setCopiedNetCoordId(null), 2000);
  };

  const handleExportNetworkLogs = () => {
    if (filteredNetworkLogs.length === 0) {
      alert('Tidak ada data uji jaringan untuk diekspor.');
      return;
    }
    const exportData = filteredNetworkLogs.map((log, idx) => ({
      No: idx + 1,
      ID: log.id,
      'Waktu Pengujian': new Date(log.timestamp).toLocaleString('id-ID'),
      'Promotor / Penguji': log.promoterName || 'Promoter Lapangan',
      'Email Penguji': log.promoterEmail || '-',
      'Download Speed (Mbps)': log.downloadMbps,
      'Upload Speed (Mbps)': log.uploadMbps,
      'Ping / Latency (ms)': log.latencyMs,
      'Jitter (ms)': log.jitterMs,
      'Tipe Jaringan': log.networkType || '4G LTE',
      'Latitude': log.location?.lat || '-',
      'Longitude': log.location?.lng || '-',
      'WhatsApp Status': log.downloadMbps >= 2 ? 'Lancar (PASS)' : 'Lambat',
      'YouTube 1080p Status': log.downloadMbps >= 15 ? 'Lancar (PASS)' : 'Lambat',
      'TikTok & Reels Status': log.downloadMbps >= 10 ? 'Lancar (PASS)' : 'Lambat'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Network_Speed_Tests');
    XLSX.writeFile(wb, `Data_Network_Speed_Tests_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleRefreshNetworkLogs = async () => {
    setLoading(true);
    try {
      const logs = await api.getSpeedTestLogs();
      setNetworkLogsList(logs);
      setFeedback({ type: 'success', message: `Berhasil memuat ${logs.length} data uji jaringan.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal merefresh data uji jaringan' });
    } finally {
      setLoading(false);
    }
  };

  // Filtered Network Logs
  const filteredNetworkLogs = networkLogsList.filter((log) => {
    if (networkFilterType !== 'ALL' && log.networkType !== networkFilterType) {
      return false;
    }
    if (networkSearch.trim()) {
      const q = networkSearch.toLowerCase();
      const matchPromoter = (log.promoterName || '').toLowerCase().includes(q);
      const matchEmail = (log.promoterEmail || '').toLowerCase().includes(q);
      const matchType = (log.networkType || '').toLowerCase().includes(q);
      const matchId = log.id.toLowerCase().includes(q);
      return matchPromoter || matchEmail || matchType || matchId;
    }
    return true;
  });

  // Network Analytics Calculations
  const netCount = networkLogsList.length;
  const avgDownload = netCount > 0
    ? Number((networkLogsList.reduce((acc, c) => acc + (c.downloadMbps || 0), 0) / netCount).toFixed(1))
    : 0;
  const avgUpload = netCount > 0
    ? Number((networkLogsList.reduce((acc, c) => acc + (c.uploadMbps || 0), 0) / netCount).toFixed(1))
    : 0;
  const avgPing = netCount > 0
    ? Math.round(networkLogsList.reduce((acc, c) => acc + (c.latencyMs || 0), 0) / netCount)
    : 0;
  const avgJitter = netCount > 0
    ? Math.round(networkLogsList.reduce((acc, c) => acc + (c.jitterMs || 0), 0) / netCount)
    : 0;

  const fastCount = networkLogsList.filter((n) => n.downloadMbps >= 50).length;
  const optimalCount = networkLogsList.filter((n) => n.downloadMbps >= 25 && n.downloadMbps < 50).length;
  const moderateCount = networkLogsList.filter((n) => n.downloadMbps >= 10 && n.downloadMbps < 25).length;
  const slowCount = networkLogsList.filter((n) => n.downloadMbps < 10).length;

  const passWhatsAppRate = netCount > 0
    ? Math.round((networkLogsList.filter((n) => n.downloadMbps >= 2).length / netCount) * 100)
    : 100;
  const passYouTubeRate = netCount > 0
    ? Math.round((networkLogsList.filter((n) => n.downloadMbps >= 15).length / netCount) * 100)
    : 100;
  const passTikTokRate = netCount > 0
    ? Math.round((networkLogsList.filter((n) => n.downloadMbps >= 10).length / netCount) * 100)
    : 100;

  return (
    <div className={`${isDarkMode ? 'bg-[#060c1c] text-slate-100' : 'bg-slate-100 text-slate-900'} min-h-screen flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200`}>
      {/* Top Bar Navigation */}
      <header className={`${isDarkMode ? 'bg-[#0a1532] border-blue-900/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'} border-b px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 transition-colors`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToMap}
            className={`${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-xs'
            } px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold transition border cursor-pointer`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Peta GIS</span>
          </button>
          <div className={`h-5 w-px ${isDarkMode ? 'bg-slate-800' : 'bg-slate-300'} hidden sm:block`}></div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-tight flex items-center gap-2`}>
                <Shield className={`w-4 h-4 ${isReadOnly ? 'text-cyan-400' : 'text-amber-500'}`} />
                {isReadOnly ? 'CMS Portal Nasional (Mode Pantau)' : 'CMS Super Admin Panel'}
              </h1>
              <span className={`text-[10px] border px-2 py-0.5 rounded font-mono font-bold ${
                isReadOnly
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  : isDarkMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}>
                {isReadOnly ? 'NASIONAL MANAGER READ-ONLY' : 'PAGE KHUSUS ADMIN'}
              </span>
            </div>
            <p className={`text-xs ${isDarkMode ? 'text-blue-200/80' : 'text-slate-600'} font-medium`}>
              {isReadOnly
                ? 'Monitoring Seluruh Dataset Wilayah, Grid, BTS, POI, dan User Se-Indonesia secara Read-Only'
                : 'Kelola Pengguna Role-Based, Update Tanggal & Periode, serta Mutasi Data GRID & POI'}
            </p>
          </div>
        </div>

        {/* Active Dataset Overview Pill */}
        <div className="flex items-center gap-2">
          {activeFolder && (
            <div className={`${isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-300'} border rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs`}>
              <Folder className="w-3.5 h-3.5 text-blue-500" />
              <div>
                <span className={`text-[10px] block leading-none ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Dataset Aktif:</span>
                <span className={`font-bold text-[11px] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{activeFolder.name}</span>
              </div>
              <span className="bg-blue-600/10 text-blue-600 dark:text-blue-300 text-[10px] px-1.5 py-0.5 rounded border border-blue-500/30 font-mono font-bold">
                {activeFolder.period || 'Q1 2026'}
              </span>
            </div>
          )}
          <button
            onClick={fetchAllData}
            className={`p-2 rounded-lg transition border cursor-pointer ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
            }`}
            title="Muat Ulang Seluruh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Read-Only Notice for Nasional Manager */}
      {isReadOnly && (
        <div className="bg-cyan-950/80 border-b border-cyan-500/30 px-6 py-3 flex items-center justify-between gap-4 text-xs text-cyan-200">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <span className="font-bold text-cyan-300">Hak Akses: Nasional Manager (Mode Pantau / Read-Only). </span>
              <span className="text-cyan-400/90">
                Anda dapat melihat seluruh data grid, BTS, POI, user, dan dataset folder se-Indonesia. Fitur penambahan, pengeditan, penghapusan, dan upload data dinonaktifkan.
              </span>
            </div>
          </div>
          <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase shrink-0">
            Read-Only
          </span>
        </div>
      )}

      {/* Main CMS Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium animate-fadeIn ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                : 'bg-red-950/60 border-red-500/50 text-red-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className={`flex flex-wrap gap-2 border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-300'}`}>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : isDarkMode
                ? 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 shadow-xs'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>1. Kelola Pengguna (Role-Based)</span>
            <span className={`${isDarkMode ? 'bg-slate-950/60 text-slate-300' : 'bg-slate-100 text-slate-700'} px-1.5 py-0.5 rounded-full text-[10px] font-mono`}>
              {usersList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('date_folder')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
              activeTab === 'date_folder'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : isDarkMode
                ? 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 shadow-xs'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>2. Update Tanggal, Periode & Folder</span>
            <span className={`${isDarkMode ? 'bg-slate-950/60 text-slate-300' : 'bg-slate-100 text-slate-700'} px-1.5 py-0.5 rounded-full text-[10px] font-mono`}>
              {folders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('grids')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
              activeTab === 'grids'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : isDarkMode
                ? 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 shadow-xs'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>3. Update & Kelola GRID</span>
            <span className="bg-slate-950/60 px-1.5 py-0.5 rounded-full text-[10px] font-mono">
              {gridsList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pois')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
              activeTab === 'pois'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>4. Update & Kelola POI</span>
            <span className="bg-slate-950/60 px-1.5 py-0.5 rounded-full text-[10px] font-mono">
              {poisList.length}
            </span>
          </button>

          {/* TAB KHUSUS ADMIN: Data Survey & Update POI */}
          {user.role === 'ADMIN' && (
            <button
              onClick={() => setActiveTab('poi_submissions')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                activeTab === 'poi_submissions'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : isDarkMode
                  ? 'bg-slate-900 text-emerald-400 hover:bg-slate-800 hover:text-emerald-300 border border-emerald-500/40'
                  : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-300 shadow-xs'
              }`}
            >
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span>Survey & Update POI (Admin Only)</span>
              <span className={`${isDarkMode ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800'} px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold`}>
                {poiLogsList.length}
              </span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('bts')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
              activeTab === 'bts'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <TowerIcon size={16} />
            <span>5. Menara BTS</span>
            <span className="bg-slate-950/60 px-1.5 py-0.5 rounded-full text-[10px] font-mono">
              {btsList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('upload_hub')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
              activeTab === 'upload_hub'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>6. Batch Upload & Template Excel</span>
          </button>

          <button
            onClick={() => setActiveTab('deploy_guide')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
              activeTab === 'deploy_guide'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Rocket className="w-4 h-4 text-amber-400" />
            <span>7. Panduan Cara Live Web</span>
          </button>

          {/* TAB DASHBOARD NETWORK CHECK */}
          <button
            onClick={() => setActiveTab('network_dashboard')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
              activeTab === 'network_dashboard'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                : isDarkMode
                ? 'bg-slate-900 text-cyan-400 hover:bg-slate-800 hover:text-cyan-300 border border-cyan-500/40'
                : 'bg-white text-cyan-700 hover:bg-cyan-50 border border-cyan-300 shadow-xs'
            }`}
          >
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Dashboard Network Check</span>
            <span className={`${isDarkMode ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/30' : 'bg-cyan-100 text-cyan-800'} px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold`}>
              {networkLogsList.length}
            </span>
          </button>
        </div>

        {/* TAB 1: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  Manajemen Pengguna Berdasarkan Role
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Super Admin dapat menambah, mengedit hak akses wilayah, dan mengatur kata sandi user.
                </p>
              </div>
              {!isReadOnly && (
                <button
                  onClick={handleOpenAddUser}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah User Baru</span>
                </button>
              )}
            </div>

            {/* Strict Role-Based Security Notice */}
            <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-3.5 flex items-start gap-3 text-xs">
              <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-slate-300">
                <p className="font-bold text-white flex items-center gap-2">
                  <span>Kebijakan Keamanan Sistem (Role-Based Enforced)</span>
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.2 text-[10px] rounded font-mono font-bold">
                    PROTECTED
                  </span>
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Hanya email/username yang <strong>terdaftar pada tabel Manajemen Pengguna ini</strong> yang dapat login masuk ke aplikasi. Akun tidak terdaftar akan otomatis <strong>Ditolak Masuk</strong> oleh server autentikasi. Status <strong>INACTIVE</strong> secara langsung mencabut izin akses.
                </p>
              </div>
            </div>

            {/* Quick Filter Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari user berdasarkan nama, email, atau cakupan wilayah (scope)..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Users Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800 font-bold">
                    <tr>
                      <th className="py-3 px-4">Nama Pengguna</th>
                      <th className="py-3 px-4">Email / Login ID</th>
                      <th className="py-3 px-4">Role Akses</th>
                      <th className="py-3 px-4">Wilayah Cakupan (Scope)</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                          Tidak ada pengguna yang sesuai pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isMainAdmin = u.email === 'admin@xlsmart.co.id';
                        return (
                          <tr key={u.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-3 px-4">
                              <div className="font-bold text-white flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-mono text-[11px] font-bold">
                                  {u.name.slice(0, 2).toUpperCase()}
                                </div>
                                <span>{u.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-300">{u.email}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                                  u.role === 'ADMIN'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                    : u.role === 'NASIONAL_MANAGER'
                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                                    : u.role === 'REGION'
                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                    : u.role === 'CITY'
                                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                }`}
                              >
                                {u.role === 'ADMIN'
                                  ? 'SUPER ADMIN'
                                  : u.role === 'NASIONAL_MANAGER'
                                  ? 'NASIONAL MANAGER (R/O)'
                                  : u.role === 'REGION'
                                  ? 'REGIONAL MANAGER'
                                  : u.role === 'CITY'
                                  ? 'CITY SPECIALIST'
                                  : 'PROMOTER'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px] text-slate-300">
                                {u.scope}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                                  (u.status || 'ACTIVE') === 'ACTIVE'
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                    : 'bg-red-500/15 text-red-400 border-red-500/30'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    (u.status || 'ACTIVE') === 'ACTIVE'
                                      ? 'bg-emerald-400 animate-pulse'
                                      : 'bg-red-400'
                                  }`}
                                ></span>
                                {(u.status || 'ACTIVE') === 'ACTIVE'
                                  ? 'ACTIVE (BISA LOGIN)'
                                  : 'INACTIVE (DIBLOKIR)'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {isReadOnly ? (
                                <span className="text-slate-500 text-[11px] italic">Read-Only</span>
                              ) : (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleOpenEditUser(u)}
                                    className="p-1.5 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg transition border border-slate-700 cursor-pointer"
                                    title="Edit User & Hak Akses"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  {!isMainAdmin && (
                                    <button
                                      onClick={() => handleDeleteUser(u.id, u.name)}
                                      className="p-1.5 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded-lg transition border border-slate-700 cursor-pointer"
                                      title="Hapus User"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: UPDATE DATE, PERIODE & FOLDER */}
        {activeTab === 'date_folder' && (
          <div className="space-y-6">
            {/* Direct Date & Period Quick Update Box */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 border border-blue-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    Update Tanggal & Periode Berlaku Dataset Aktif
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ubah tanggal rilis data (e.g. 2026-03-22) dan periode analisis (e.g. Q1 2026) untuk folder '{activeFolder?.name}'.
                  </p>
                </div>
                {!isReadOnly && (
                  <button
                    onClick={handleSaveDateAndPeriod}
                    disabled={isDateSaving}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-2 shadow cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isDateSaving ? 'Menyimpan...' : 'Simpan Tanggal & Periode'}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tanggal Rilis Data (Date)
                  </label>
                  <input
                    type="date"
                    disabled={isReadOnly}
                    value={editDateValue}
                    onChange={(e) => setEditDateValue(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Menentukan kapan data pasar & prioritas grid ini dihitung.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Periode Analisis (Label Periode)
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={editPeriodValue}
                    onChange={(e) => setEditPeriodValue(e.target.value)}
                    placeholder="Contoh: Q1 2026, Maret 2026, Semester 1 2026"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Label waktu yang ditampilkan di header, kartu KPI, dan laporan eksekutif.
                  </span>
                </div>
              </div>
            </div>

            {/* Folder Dataset Hub */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Folder className="w-4 h-4 text-amber-400" />
                    Daftar Folder Dataset Tersimpan
                  </h3>
                  <p className="text-xs text-slate-400">
                    Setiap folder menyimpan kumpulan data Grid, BTS, dan POI secara mandiri.
                  </p>
                </div>
                {!isReadOnly && (
                  <button
                    onClick={() => setIsAddFolderModalOpen(true)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Buat Folder Baru</span>
                  </button>
                )}
              </div>

              {/* Folders Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {folders.map((f) => (
                  <div
                    key={f.id}
                    className={`rounded-2xl p-4 border transition flex flex-col justify-between ${
                      f.isActive
                        ? 'bg-blue-950/30 border-blue-500/50 shadow-lg shadow-blue-500/10'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-xl ${f.isActive ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                            <Folder className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-xs leading-snug">{f.name}</h4>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {f.region || 'ALL'} &bull; {f.city || 'ALL'}
                            </span>
                          </div>
                        </div>
                        {f.isActive && (
                          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">
                            AKTIF
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-2 mb-3">
                        {f.description || 'Tidak ada deskripsi'}
                      </p>

                      {/* Date & Period Badge */}
                      <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2 mb-3 flex items-center justify-between text-[11px]">
                        <div>
                          <span className="text-slate-500 text-[10px] block">Tanggal:</span>
                          <span className="font-mono text-slate-300 font-semibold">{f.dataDate || '2026-03-22'}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-500 text-[10px] block">Periode:</span>
                          <span className="font-semibold text-blue-400">{f.period || 'Q1 2026'}</span>
                        </div>
                      </div>

                      {/* Stats Pills */}
                      <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] mb-4">
                        <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                          <span className="text-slate-500 block">Grids</span>
                          <span className="font-bold text-white font-mono">{f.gridCount}</span>
                        </div>
                        <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                          <span className="text-slate-500 block">BTS</span>
                          <span className="font-bold text-white font-mono">{f.btsCount}</span>
                        </div>
                        <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                          <span className="text-slate-500 block">POI</span>
                          <span className="font-bold text-white font-mono">{f.poiCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                      {!f.isActive ? (
                        <button
                          onClick={() => handleActivateFolder(f.id)}
                          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-1.5 rounded-lg transition text-center cursor-pointer"
                        >
                          Aktifkan Dataset Ini
                        </button>
                      ) : (
                        <div className="flex-1 text-center py-1.5 text-xs text-emerald-400 font-bold flex items-center justify-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Dataset Aktif Peta</span>
                        </div>
                      )}
                      <a
                        href={`/api/folders/${f.id}/export`}
                        download
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition border border-slate-700"
                        title="Unduh Backup JSON Folder"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: UPDATE & KELOLA GRID */}
        {activeTab === 'grids' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Grid className="w-4 h-4 text-emerald-400" />
                  Katalog & Pembaruan GRID Terintegrasi
                </h3>
                <p className="text-xs text-slate-400">
                  Total {gridsList.length} Grid terdaftar pada dataset aktif. Anda dapat menambah, mengubah populasi, MS kompetitor, atau prioritas akuisisi.
                </p>
              </div>
              {!isReadOnly && (
                <button
                  onClick={handleOpenAddGrid}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Grid Baru</span>
                </button>
              )}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap gap-2.5">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari Grid ID atau Kecamatan..."
                  value={gridSearch}
                  onChange={(e) => setGridSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={gridCategoryFilter}
                onChange={(e) => setGridCategoryFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">Semua Kategori Prioritas</option>
                <option value="1st Priority Acquisition">1st Priority Acquisition</option>
                <option value="2nd Priority Acquisition">2nd Priority Acquisition</option>
                <option value="3rd Priority">3rd Priority</option>
                <option value="Avoid Cannibalism">Avoid Cannibalism</option>
              </select>
            </div>

            {/* Grids Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800 sticky top-0 z-10 font-bold backdrop-blur">
                    <tr>
                      <th className="py-2.5 px-3">id</th>
                      <th className="py-2.5 px-3">sitename</th>
                      <th className="py-2.5 px-3">site_type</th>
                      <th className="py-2.5 px-3">Wilayah (Kec, Kota, Prov)</th>
                      <th className="py-2.5 px-3">Region</th>
                      <th className="py-2.5 px-3">latitude, longitude</th>
                      <th className="py-2.5 px-3">GRID_META_ID</th>
                      <th className="py-2.5 px-3 text-right">Rev_August_2026</th>
                      <th className="py-2.5 px-3">Revenue_Flag</th>
                      <th className="py-2.5 px-3">SF_Grid_Category</th>
                      <th className="py-2.5 px-3">Device_Status</th>
                      <th className="py-2.5 px-3 text-right sticky right-0 bg-slate-950/95">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredGrids.slice(0, 100).map((g) => {
                      const category = g['SF Grid Category'] || g.SF_Grid_Category || g.cat || 'Avoid Cannibalism';
                      const catTheme = getCategoryTheme(category);
                      const revNum = typeof g.Rev_August_2026 === 'number' ? g.Rev_August_2026 : (parseFloat(String(g.Rev_August_2026)) || 0);
                      const formattedRev = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(revNum);
                      const lat = g.latitude !== undefined ? g.latitude : g.center?.[0] ?? 0;
                      const lng = g.longitude !== undefined ? g.longitude : g.center?.[1] ?? 0;
                      const status = g.Device_Status || 'Active';
                      const isNormal = status === 'Active' || status === 'Normal';

                      return (
                        <tr key={g.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-2.5 px-3 font-mono font-bold text-white">{g.id}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-200">
                            {g.sitename || `${g.Kecamatan || g.kecamatan} Grid ${g.id.slice(-4)}`}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded border border-slate-700">
                              {g.site_type || 'Macro'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="text-white font-semibold">{g.Kecamatan || g.kecamatan}</div>
                            <div className="text-[10px] text-slate-400">{g.City || g.city} &bull; {g.Province || g.province}</div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">{g.Region || g.region}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                            {lat.toFixed(4)}, {lng.toFixed(4)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                            {g.GRID_META_ID || `GM-${g.id}`}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                            {formattedRev}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="bg-blue-950/60 text-blue-300 border border-blue-800/60 text-[10px] px-2 py-0.5 rounded font-medium">
                              {g.Revenue_Flag || 'Rev >40 Mn'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2.5 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1.5 shadow-xs ${catTheme.badgeDark}`}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: catTheme.hex }}
                              />
                              <span>{category}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isNormal
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
                                : 'bg-amber-950/60 text-amber-300 border-amber-800/50'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isNormal ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                              {status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right sticky right-0 bg-slate-900/95 border-l border-slate-800">
                            {isReadOnly ? (
                              <span className="text-slate-500 text-[11px] italic">Read-Only</span>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditGrid(g)}
                                  className="p-1.5 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg transition border border-slate-700 cursor-pointer"
                                  title="Edit Grid (15 Field Lengkap)"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteGrid(g.id)}
                                  className="p-1.5 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded-lg transition border border-slate-700 cursor-pointer"
                                  title="Hapus Grid"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredGrids.length > 100 && (
                <div className="p-2.5 bg-slate-950 text-center text-slate-500 text-xs border-t border-slate-800">
                  Menampilkan 100 dari total {filteredGrids.length} Grid. Gunakan pencarian untuk menyaring lebih spesifik.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: UPDATE & KELOLA POI */}
        {activeTab === 'pois' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-purple-400" />
                  Katalog Titik POI (12 Headers Master Schema)
                </h3>
                <p className="text-xs text-slate-400">
                  Total {poisList.length} POI terdaftar dengan format data: Meta Grid ID, REGION, PROVINCE, XLS CITY, KECAMATAN, POI_ID, POI_NAME_RAW, POI_NAME, TAXON_NAME_RAW, TAXON_NAME, LATITUDE, LONGITUDE.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportPOIData}
                  className="bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-emerald-600/50 flex items-center gap-1.5 transition cursor-pointer shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export POI Master (.xlsx)</span>
                </button>
                <button
                  onClick={() => downloadTemplate('poi')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Format Excel POI (12 Field)</span>
                </button>
                {!isReadOnly && (
                  <button
                    onClick={handleOpenAddPoi}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah POI Baru</span>
                  </button>
                )}
              </div>
            </div>

            {/* POI Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari POI berdasarkan POI_ID, nama raw/clean, kategori taxon, kecamatan, kota, atau Meta Grid ID..."
                value={poiSearch}
                onChange={(e) => setPoiSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* POIs Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800 sticky top-0 z-10 font-bold backdrop-blur">
                    <tr>
                      <th className="py-2.5 px-3">POI_ID</th>
                      <th className="py-2.5 px-3">POI_NAME / RAW</th>
                      <th className="py-2.5 px-3">TAXON_NAME / RAW</th>
                      <th className="py-2.5 px-3">KECAMATAN & CITY</th>
                      <th className="py-2.5 px-3">REGION / PROV</th>
                      <th className="py-2.5 px-3">META GRID ID</th>
                      <th className="py-2.5 px-3">LATITUDE, LONGITUDE</th>
                      <th className="py-2.5 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredPois.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                          Belum ada POI yang terdaftar atau sesuai pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredPois.map((p) => {
                        const poiId = p.POI_ID || p.poi_id || p.id;
                        const poiName = p.POI_NAME || p.name;
                        const poiNameRaw = p.POI_NAME_RAW || p.poi_name_raw || poiName;
                        const taxon = p.TAXON_NAME || p.type || 'Traditional Market';
                        const taxonRaw = p.TAXON_NAME_RAW || p.taxon_name_raw || taxon;
                        const kec = p.KECAMATAN || p.kec || p.kecamatan || 'Bangkalan';
                        const city = p['XLS CITY'] || p.city || 'KAB. BANGKALAN';
                        const region = p.REGION || p.region || 'EAST JAVA';
                        const prov = p.PROVINCE || p.province || 'JAWA TIMUR (4672)';
                        const metaGrid = p['Meta Grid ID'] || p.grid || p.gridId || '3526001000';
                        const lat = p.LATITUDE ?? p.lat ?? -7.054;
                        const lng = p.LONGITUDE ?? p.lng ?? 112.742;

                        return (
                          <tr key={poiId} className="hover:bg-slate-800/40 transition">
                            <td className="py-2.5 px-3 font-mono font-bold text-white text-xs">
                              {poiId}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                <span>{poiName}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[220px]" title={poiNameRaw}>
                                Raw: {poiNameRaw}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="bg-purple-950/60 text-purple-300 border border-purple-800/60 text-[10px] px-2 py-0.5 rounded font-medium inline-block mb-0.5">
                                {taxon}
                              </span>
                              <div className="text-[10px] text-slate-500 truncate max-w-[180px]" title={taxonRaw}>
                                {taxonRaw}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-300">
                              <div className="font-semibold text-white">{kec}</div>
                              <div className="text-[10px] text-slate-400">{city}</div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-300">
                              <div className="font-mono text-xs text-slate-200">{region}</div>
                              <div className="text-[10px] text-slate-500">{prov}</div>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-300 text-xs">
                              {metaGrid}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                              {typeof lat === 'number' ? lat.toFixed(4) : lat}, {typeof lng === 'number' ? lng.toFixed(4) : lng}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {isReadOnly ? (
                                <span className="text-slate-500 text-[11px] italic">Read-Only</span>
                              ) : (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleOpenEditPoi(p)}
                                    className="p-1.5 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg transition border border-slate-700 cursor-pointer"
                                    title="Edit POI (12 Field Master)"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePoi(p.id || p.POI_ID, p.POI_NAME || p.name)}
                                    className="p-1.5 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded-lg transition border border-slate-700 cursor-pointer"
                                    title="Hapus POI"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: BTS TOWERS */}
        {activeTab === 'bts' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TowerIcon size={16} className="text-cyan-400" />
                  Katalog Menara BTS Terpasang (16 Headers Master)
                </h3>
                <p className="text-xs text-slate-400">
                  Total {btsList.length} menara BTS terdaftar dengan skema 16 field standar telekomunikasi.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportBTSData}
                  className="bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-emerald-600/50 flex items-center gap-1.5 transition cursor-pointer shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export BTS Master (.xlsx)</span>
                </button>
                <button
                  onClick={() => downloadTemplate('bts')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Format Excel BTS (16 Field)</span>
                </button>
              </div>
            </div>

            {/* BTS Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari BTS berdasarkan ID, sitename, kecamatan, GRID_META_ID, atau BSP..."
                value={btsSearch}
                onChange={(e) => setBtsSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* BTS Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800 sticky top-0 z-10 font-bold backdrop-blur">
                    <tr>
                      <th className="py-2.5 px-3">id</th>
                      <th className="py-2.5 px-3">sitename</th>
                      <th className="py-2.5 px-3 text-center">Aging (Month)</th>
                      <th className="py-2.5 px-3">site_type</th>
                      <th className="py-2.5 px-3">Site Function</th>
                      <th className="py-2.5 px-3">Province</th>
                      <th className="py-2.5 px-3">City</th>
                      <th className="py-2.5 px-3">Kecamatan</th>
                      <th className="py-2.5 px-3">latitude, ongitude</th>
                      <th className="py-2.5 px-3">Region</th>
                      <th className="py-2.5 px-3">GRID_META_ID</th>
                      <th className="py-2.5 px-3">Revenue Flag</th>
                      <th className="py-2.5 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {btsList
                      .filter(b => {
                        const q = btsSearch.toLowerCase();
                        return (
                          b.id.toLowerCase().includes(q) ||
                          (b.sitename && b.sitename.toLowerCase().includes(q)) ||
                          (b.name && b.name.toLowerCase().includes(q)) ||
                          (b.Kecamatan && b.Kecamatan.toLowerCase().includes(q)) ||
                          (b.GRID_META_ID && b.GRID_META_ID.toLowerCase().includes(q))
                        );
                      })
                      .map((b) => {
                        const aging = b['Aging (Month)'] ?? b.aging_month ?? 24;
                        const sitename = b.sitename || b.name || `BTS #${b.id}`;
                        const siteType = b.site_type || b.type || 'Macro';
                        const siteFunc = b['Site Function'] || b.func || 'Residential';
                        const province = b.Province || b.province || 'JAWA TIMUR (4672)';
                        const city = b.City || b.city || 'KAB. BANGKALAN';
                        const kecamatan = b.Kecamatan || b.kec || 'Bangkalan';
                        const region = b.Region || b.region || 'EAST JAVA';
                        const metaId = b.GRID_META_ID || b.grid || `GM-${b.id}`;
                        const revFlag = b['Revenue Flag'] || b.rev || 'Rev >40 Mn';
                        const lat = b.latitude ?? b.lat ?? -7.054;
                        const lng = b.ongitude ?? b.longitude ?? b.lng ?? 112.742;

                        return (
                          <tr key={b.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">{b.id}</td>
                            <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                              <div className="w-5 h-5 rounded-md bg-cyan-950/70 border border-cyan-800/80 flex items-center justify-center shrink-0">
                                <TowerIcon size={12} className="text-cyan-400" />
                              </div>
                              <span>{sitename}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                              <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] font-semibold">
                                {aging} bln
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="bg-blue-950/70 text-blue-300 border border-blue-800/60 px-2 py-0.5 rounded text-[10px] font-semibold">
                                {siteType}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-300">{siteFunc}</td>
                            <td className="py-2.5 px-3 text-slate-400">{province}</td>
                            <td className="py-2.5 px-3 text-slate-300">{city}</td>
                            <td className="py-2.5 px-3 text-white font-medium">{kecamatan}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                              {lat.toFixed(4)}, {lng.toFixed(4)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400">{region}</td>
                            <td className="py-2.5 px-3 font-mono text-amber-300">{metaId}</td>
                            <td className="py-2.5 px-3">
                              <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 text-[10px] px-2 py-0.5 rounded font-semibold">
                                {revFlag}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {isReadOnly ? (
                                <span className="text-slate-500 text-[11px] italic">Read-Only</span>
                              ) : (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleOpenEditBTS(b)}
                                    className="p-1.5 bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white rounded-lg transition border border-slate-700 cursor-pointer"
                                    title="Edit BTS Master"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteBTS(b.id, sitename)}
                                    className="p-1.5 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded-lg transition border border-slate-700 cursor-pointer"
                                    title="Hapus BTS"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: BATCH UPLOAD & TEMPLATE HUB */}
        {activeTab === 'upload_hub' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Upload className="w-4 h-4 text-blue-400" />
                      Pusat Unggah Berkas & Sinkronisasi Folder
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Unggah berkas Excel (.xlsx), CSV, atau GeoJSON untuk memperbarui dataset aktif secara massal.
                    </p>
                  </div>
                  {activeFolder && (
                    <span className="text-[11px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2.5 py-1 rounded-lg font-mono font-semibold">
                      Target: {activeFolder.name}
                    </span>
                  )}
                </div>

                {isReadOnly ? (
                  <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-xl p-5 text-xs text-cyan-300 flex items-start gap-3">
                    <Shield className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-sm">Mode Pantau Aktif (Read-Only)</span>
                      <p className="text-cyan-300/80 mt-1">
                        Akun Nasional Manager memiliki izin untuk memonitor dan meninjau seluruh data nasional, namun tidak dapat mengunggah berkas baru atau memodifikasi database. Anda tetap dapat mengunduh Template Excel resmi di kolom sebelah kanan.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                {/* Configuration: Target Folder & Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      1. Folder Tujuan Penyimpanan
                    </label>
                    <select
                      value={uploadTargetFolderId || activeFolder?.id || ''}
                      onChange={(e) => setUploadTargetFolderId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-semibold text-xs focus:border-blue-500 focus:outline-none cursor-pointer"
                    >
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          📁 {f.name} {f.isActive ? '(Aktif di Peta)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      2. Mode Pembaruan Data
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setUploadMode('merge')}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                          uploadMode === 'merge'
                            ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        Merge / Update
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadMode('replace')}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                          uploadMode === 'replace'
                            ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        Replace / Timpa
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dropzone with Hidden Input & Click/Drag handlers */}
                <input
                  type="file"
                  ref={uploadFileInputRef}
                  multiple
                  accept=".xlsx,.xls,.csv,.json,.geojson"
                  className="hidden"
                  onChange={(e) => {
                    handleBatchFiles(e.target.files);
                    e.target.value = '';
                  }}
                />

                <div
                  onClick={() => uploadFileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    if (e.dataTransfer.files) {
                      handleBatchFiles(e.dataTransfer.files);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition cursor-pointer ${
                    isDraggingFile
                      ? 'border-blue-400 bg-blue-950/40 scale-[1.01]'
                      : 'border-slate-700 hover:border-blue-500/80 bg-slate-950/60 hover:bg-slate-950/90'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mx-auto mb-3">
                    <CloudUpload className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-white block">
                    {isProcessingFiles ? 'Sedang Memproses Berkas...' : 'Klik atau Seret Berkas ke Area Ini'}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Mendukung berkas Excel (.xlsx, .xls), CSV, GeoJSON berkapasitas besar
                  </span>
                  <span className="inline-block mt-3 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold rounded-lg transition shadow-sm">
                    Pilih File dari Komputer
                  </span>
                </div>

                {/* Staged Files Preview List */}
                {stagedFiles.length > 0 && (
                  <div className="space-y-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-emerald-400" />
                        <span>Berkas Terpilih ({stagedFiles.length})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setStagedFiles([])}
                        className="text-[11px] text-red-400 hover:text-red-300 font-medium transition cursor-pointer"
                      >
                        Hapus Semua
                      </button>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                      {stagedFiles.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileSpreadsheet className="w-4 h-4 text-blue-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-200 truncate">{item.file.name}</p>
                              <span className="text-[10px] text-slate-400">
                                {(item.file.size / 1024).toFixed(1)} KB &bull;{' '}
                                <strong className="text-emerald-400">{item.records.length} baris</strong>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                item.type === 'grid'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : item.type === 'bts'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              }`}
                            >
                              {item.type}
                            </span>
                            <button
                              type="button"
                              onClick={() => setStagedFiles((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-red-400 p-1 rounded transition cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Auto activate toggle & execute button */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={uploadAutoActivate}
                          onChange={(e) => setUploadAutoActivate(e.target.checked)}
                          className="rounded border-slate-700 text-blue-500 focus:ring-0 cursor-pointer"
                        />
                        <span>Aktifkan folder ini ke peta GIS secara langsung setelah unggah</span>
                      </label>

                      <button
                        type="button"
                        onClick={handleExecuteBatchUpload}
                        disabled={isUploading}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isUploading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>{uploadProgressText || 'Mengunggah ke Database...'}</span>
                          </>
                        ) : (
                          <>
                            <CloudUpload className="w-4 h-4" />
                            <span>
                              Unggah & Simpan ke Database ({stagedFiles.reduce((a, b) => a + b.records.length, 0).toLocaleString()} Baris)
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                  </>
                )}
              </div>
            </div>

            {/* Template Downloads Side Card */}
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Template Excel Resmi
                </h3>
                <p className="text-xs text-slate-400">
                  Gunakan format kolom yang sudah terstandarisasi untuk menghindari kegagalan saat import:
                </p>

                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => downloadTemplate('grid')}
                    className="w-full bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold py-2.5 px-3 rounded-xl flex items-center justify-between transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Grid className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Template GRID Master</span>
                    </span>
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    onClick={() => downloadTemplate('bts')}
                    className="w-full bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold py-2.5 px-3 rounded-xl flex items-center justify-between transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <TowerIcon size={14} className="text-cyan-400" />
                      <span>Template Menara BTS</span>
                    </span>
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    onClick={() => downloadTemplate('poi')}
                    className="w-full bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold py-2.5 px-3 rounded-xl flex items-center justify-between transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-purple-400" />
                      <span>Template POI & Outlet</span>
                    </span>
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: PANDUAN CARA LIVE WEB */}
        {activeTab === 'deploy_guide' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 animate-fadeIn">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Rocket className="w-5 h-5 text-blue-400" />
                <span>Panduan Cara Live Web & Deploy Production</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Langkah-langkah resmi mempublikasikan web GRID Promoter ini agar dapat diakses oleh publik, manajemen, dan tim sales secara online.
              </p>
            </div>
            <DeployGuideContent />
          </div>
        )}

        {/* TAB KHUSUS ADMIN: DATA FORM POI TERISI */}
        {activeTab === 'poi_submissions' && (
          user.role !== 'ADMIN' ? (
            <div className="bg-red-950/60 border border-red-500/40 rounded-2xl p-8 text-center text-red-300 space-y-3">
              <Shield className="w-12 h-12 text-red-400 mx-auto" />
              <h3 className="text-base font-bold text-white">Akses Dibatasi: Khusus Super Admin</h3>
              <p className="text-xs text-red-200/80 max-w-md mx-auto">
                Halaman data formulir POI yang telah diisi oleh promotor ini hanya dapat diakses dan dikelola oleh akun dengan role ADMIN.
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-fadeIn">
              {/* Header Banner */}
              <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4`}>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'} flex items-center gap-2`}>
                      <FileCheck className="w-5 h-5 text-emerald-400" />
                      <span>Data Hasil Survey & Update POI (Promotor Lapangan)</span>
                    </h2>
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase">
                      Khusus Admin
                    </span>
                  </div>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
                    Rekapitulasi data survei & pembaruan POI dari formulir lapangan yang diisi oleh promotor, lengkap dengan titik koordinat satelit GPS, foto dokumentasi, dan catatan lapangan.
                  </p>
                </div>

                {/* Action Buttons: Export Excel & Refresh */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleExportPoiLogs}
                    disabled={filteredPoiLogs.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-md shadow-emerald-600/20"
                    title="Download Rekap Spreadsheet Excel"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Ekspor Excel (.xlsx)</span>
                  </button>
                  <button
                    onClick={handleRefreshPoiLogs}
                    disabled={loading}
                    className={`${
                      isDarkMode
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
                    } border px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer`}
                    title="Muat ulang data terbaru"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* KPI Cards Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Card 1: Total POI Terisi */}
                <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-4 flex flex-col justify-between`}>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-medium">Total Form POI Terisi</span>
                    <MapPin className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-tight`}>
                    {poiLogsList.length}
                  </div>
                  <div className="text-[11px] text-emerald-400 mt-1 font-medium">
                    Entri survei tersimpan
                  </div>
                </div>

                {/* Card 2: Total Foto Terlampir */}
                <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-4 flex flex-col justify-between`}>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-medium">Foto Dokumentasi</span>
                    <Camera className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-tight`}>
                    {totalPhotosCount}
                  </div>
                  <div className="text-[11px] text-blue-400 mt-1 font-medium">
                    Bukti foto lapangan
                  </div>
                </div>

                {/* Card 3: Promotor Aktif */}
                <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-4 flex flex-col justify-between`}>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-medium">Promotor Kontributor</span>
                    <Users className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-tight`}>
                    {uniquePoiPromoters.length}
                  </div>
                  <div className="text-[11px] text-amber-400 mt-1 font-medium">
                    Pengisi formulir aktif
                  </div>
                </div>

                {/* Card 4: Titik GPS */}
                <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-4 flex flex-col justify-between`}>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-medium">Verifikasi Satelit GPS</span>
                    <Shield className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-tight`}>
                    100%
                  </div>
                  <div className="text-[11px] text-purple-400 mt-1 font-medium">
                    Semua entri berkoordinat
                  </div>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3`}>
                <div className="flex items-center gap-3 flex-1 min-w-[260px] flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={poiLogsSearch}
                      onChange={(e) => setPoiLogsSearch(e.target.value)}
                      placeholder="Cari nama outlet, promotor, catatan, ID..."
                      className={`w-full pl-9 pr-8 py-2 text-xs rounded-xl border font-medium ${
                        isDarkMode
                          ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-blue-500'
                          : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                      } focus:outline-none`}
                    />
                    {poiLogsSearch && (
                      <button
                        onClick={() => setPoiLogsSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Filter Kategori */}
                  <select
                    value={poiLogsCategoryFilter}
                    onChange={(e) => setPoiLogsCategoryFilter(e.target.value)}
                    className={`text-xs px-3 py-2 rounded-xl border font-medium cursor-pointer ${
                      isDarkMode
                        ? 'bg-slate-950 border-slate-800 text-slate-200'
                        : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value="ALL">Semua Kategori ({poiLogsList.length})</option>
                    {uniquePoiCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  {/* Filter Promotor */}
                  <select
                    value={poiLogsPromoterFilter}
                    onChange={(e) => setPoiLogsPromoterFilter(e.target.value)}
                    className={`text-xs px-3 py-2 rounded-xl border font-medium cursor-pointer ${
                      isDarkMode
                        ? 'bg-slate-950 border-slate-800 text-slate-200'
                        : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value="ALL">Semua Promotor ({uniquePoiPromoters.length})</option>
                    {uniquePoiPromoters.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="text-xs text-slate-400 font-medium">
                  Menampilkan <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{filteredPoiLogs.length}</span> dari {poiLogsList.length} laporan
                </div>
              </div>

              {/* Main Table / Data List */}
              <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl overflow-hidden`}>
                {filteredPoiLogs.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 space-y-2">
                    <MapPin className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    <p className="text-sm font-semibold">Belum Ada Data Formulir POI Terisi</p>
                    <p className="text-xs max-w-md mx-auto text-slate-500">
                      {poiLogsSearch || poiLogsCategoryFilter !== 'ALL' || poiLogsPromoterFilter !== 'ALL'
                        ? 'Tidak ada data yang cocok dengan filter pencarian Anda. Coba reset filter.'
                        : 'Data akan muncul secara otomatis ketika promotor lapangan mengirimkan laporan survei atau update POI.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className={`${isDarkMode ? 'bg-slate-950/70 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'} border-b font-semibold uppercase tracking-wider text-[10px]`}>
                          <th className="py-3 px-4 w-12 text-center">No</th>
                          <th className="py-3 px-4 w-24">Foto Bukti</th>
                          <th className="py-3 px-4">Nama POI / Outlet & Kategori</th>
                          <th className="py-3 px-4">Promotor Pengisi</th>
                          <th className="py-3 px-4">Koordinat GPS & Akurasi</th>
                          <th className="py-3 px-4">Catatan Lapangan</th>
                          <th className="py-3 px-4">Waktu Submit</th>
                          <th className="py-3 px-4 text-center w-28">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                        {filteredPoiLogs.map((log, index) => (
                          <tr
                            key={log.id}
                            className={`${isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'} transition-colors`}
                          >
                            {/* No */}
                            <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                              {index + 1}
                            </td>

                            {/* Foto Bukti */}
                            <td className="py-3.5 px-4">
                              {log.photos && log.photos.length > 0 ? (
                                <div
                                  className="relative group cursor-pointer w-14 h-14 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shrink-0"
                                  onClick={() => setActivePhotoModal(log.photos[0])}
                                  title="Klik untuk memperbesar foto"
                                >
                                  <img
                                    src={log.photos[0]}
                                    alt="Bukti"
                                    className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                                  />
                                  {log.photos.length > 1 && (
                                    <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-mono font-bold px-1 rounded">
                                      +{log.photos.length - 1}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className={`w-14 h-14 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-600' : 'bg-slate-100 border-slate-300 text-slate-400'} flex items-center justify-center shrink-0`}>
                                  <Camera className="w-5 h-5" />
                                </div>
                              )}
                            </td>

                            {/* Nama Outlet & Kategori */}
                            <td className="py-3.5 px-4">
                              <div className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'} flex items-center gap-1.5`}>
                                <span>{log.poiName || 'Titik POI Promoter'}</span>
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                {log.poiCategory && (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                                    isDarkMode
                                      ? 'bg-blue-950/60 text-blue-300 border-blue-800/60'
                                      : 'bg-blue-50 text-blue-700 border-blue-200'
                                  }`}>
                                    {log.poiCategory}
                                  </span>
                                )}
                                {log.gridId && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono text-slate-400 border border-slate-700 bg-slate-950">
                                    Grid: {log.gridId}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Promotor Pengisi */}
                            <td className="py-3.5 px-4">
                              <div className={`font-semibold text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {log.promoterName}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                {log.promoterEmail || '-'}
                              </div>
                            </td>

                            {/* Koordinat GPS & Akurasi */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 font-mono text-emerald-400 text-xs">
                                <MapPin className="w-3.5 h-3.5 shrink-0 text-pink-500" />
                                <span>{log.location.lat.toFixed(6)}, {log.location.lng.toFixed(6)}</span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                                {log.location.accuracy && (
                                  <span className="text-slate-400">Akurasi: ±{log.location.accuracy}m</span>
                                )}
                                <button
                                  onClick={() => handleCopyCoordinates(log.id, log.location.lat, log.location.lng)}
                                  className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px] cursor-pointer"
                                  title="Salin Koordinat"
                                >
                                  {copiedCoordId === log.id ? (
                                    <>
                                      <CheckCheck className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-400">Tersalin!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Salin</span>
                                    </>
                                  )}
                                </button>
                                <a
                                  href={`https://www.google.com/maps?q=${log.location.lat},${log.location.lng}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px]"
                                  title="Buka di Google Maps"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Peta</span>
                                </a>
                              </div>
                            </td>

                            {/* Catatan Lapangan */}
                            <td className="py-3.5 px-4 max-w-xs">
                              {log.notes ? (
                                <p className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} line-clamp-2`}>
                                  {log.notes}
                                </p>
                              ) : (
                                <span className="italic text-slate-500 text-xs">Tidak ada catatan</span>
                              )}
                            </td>

                            {/* Waktu Submit */}
                            <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                              <div>{new Date(log.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                              <div className="text-[10px] text-slate-500">{new Date(log.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                            </td>

                            {/* Aksi */}
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setSelectedPoiLogDetail(log)}
                                  className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition cursor-pointer"
                                  title="Lihat Detail & Foto Lengkap"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeletePoiLog(log.id)}
                                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition cursor-pointer"
                                  title="Hapus Entri POI Ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {/* TAB: DASHBOARD NETWORK CHECK */}
        {activeTab === 'network_dashboard' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header Banner */}
            <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4`}>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'} flex items-center gap-2`}>
                    <Activity className="w-5 h-5 text-cyan-400" />
                    <span>Dashboard Kualitas Jaringan & Speed Test Lapangan</span>
                  </h2>
                  <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase">
                    Network Intelligence
                  </span>
                </div>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
                  Pemantauan performa kecepatan unduh (download), unggah (upload), latensi ping, dan uji kelayakan layanan digital di titik koordinat promotor.
                </p>
              </div>

              {/* Action Buttons: Export Excel & Refresh */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleExportNetworkLogs}
                  disabled={filteredNetworkLogs.length === 0}
                  className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-md shadow-cyan-600/20"
                  title="Download Rekap Spreadsheet Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Ekspor Excel (.xlsx)</span>
                </button>
                <button
                  onClick={handleRefreshNetworkLogs}
                  disabled={loading}
                  className={`${
                    isDarkMode
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
                  } border px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer`}
                  title="Muat ulang data terbaru"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* KPI Cards Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Card 1: Rata-rata Download */}
              <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-4 flex flex-col justify-between`}>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-medium">Rata-rata Download</span>
                  <Activity className="w-4 h-4 text-emerald-400" />
                </div>
                <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-tight flex items-baseline gap-1`}>
                  {avgDownload} <span className="text-xs font-semibold text-slate-400">Mbps</span>
                </div>
                <div className="text-[11px] text-emerald-400 mt-1 font-medium">
                  {avgDownload >= 40 ? '✓ Sangat Cepat (4G+ Ready)' : avgDownload >= 20 ? 'Optimal' : 'Perlu Penguatan'}
                </div>
              </div>

              {/* Card 2: Rata-rata Upload */}
              <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-4 flex flex-col justify-between`}>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-medium">Rata-rata Upload</span>
                  <Wifi className="w-4 h-4 text-blue-400" />
                </div>
                <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-tight flex items-baseline gap-1`}>
                  {avgUpload} <span className="text-xs font-semibold text-slate-400">Mbps</span>
                </div>
                <div className="text-[11px] text-blue-400 mt-1 font-medium">
                  Kecepatan unggah live
                </div>
              </div>

              {/* Card 3: Rata-rata Latensi / Ping */}
              <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-4 flex flex-col justify-between`}>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-medium">Rata-rata Latensi (Ping)</span>
                  <Gauge className="w-4 h-4 text-cyan-400" />
                </div>
                <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-tight flex items-baseline gap-1`}>
                  {avgPing} <span className="text-xs font-semibold text-slate-400">ms</span>
                </div>
                <div className="text-[11px] text-cyan-400 mt-1 font-medium">
                  Jitter rerata: ±{avgJitter} ms
                </div>
              </div>

              {/* Card 4: Total Tes & Pass Rate */}
              <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-4 flex flex-col justify-between`}>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-medium">Total Uji & Pass Rate</span>
                  <CheckCheck className="w-4 h-4 text-purple-400" />
                </div>
                <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-tight flex items-baseline gap-1`}>
                  {netCount} <span className="text-xs font-semibold text-purple-400">({passYouTubeRate}%)</span>
                </div>
                <div className="text-[11px] text-purple-400 mt-1 font-medium">
                  Lolos standar streaming
                </div>
              </div>
            </div>

            {/* Performance Quality Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Distribution Bands */}
              <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-5 space-y-3.5`}>
                <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'} flex items-center gap-2`}>
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Distribusi Kecepatan Jaringan Lapangan</span>
                </h3>
                <div className="space-y-3 text-xs">
                  {/* Band 1: > 50 Mbps */}
                  <div>
                    <div className="flex justify-between mb-1 font-medium">
                      <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        Sangat Cepat (&gt; 50 Mbps)
                      </span>
                      <span className="text-slate-400">{fastCount} tes ({netCount > 0 ? Math.round((fastCount / netCount) * 100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${netCount > 0 ? (fastCount / netCount) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  {/* Band 2: 25 - 50 Mbps */}
                  <div>
                    <div className="flex justify-between mb-1 font-medium">
                      <span className="text-blue-400 flex items-center gap-1.5 font-bold">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        Optimal (25 - 50 Mbps)
                      </span>
                      <span className="text-slate-400">{optimalCount} tes ({netCount > 0 ? Math.round((optimalCount / netCount) * 100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${netCount > 0 ? (optimalCount / netCount) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  {/* Band 3: 10 - 25 Mbps */}
                  <div>
                    <div className="flex justify-between mb-1 font-medium">
                      <span className="text-amber-400 flex items-center gap-1.5 font-bold">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        Standar (10 - 25 Mbps)
                      </span>
                      <span className="text-slate-400">{moderateCount} tes ({netCount > 0 ? Math.round((moderateCount / netCount) * 100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${netCount > 0 ? (moderateCount / netCount) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  {/* Band 4: < 10 Mbps */}
                  <div>
                    <div className="flex justify-between mb-1 font-medium">
                      <span className="text-red-400 flex items-center gap-1.5 font-bold">
                        <span className="w-2 h-2 rounded-full bg-red-400"></span>
                        Kurang / Lemah (&lt; 10 Mbps)
                      </span>
                      <span className="text-slate-400">{slowCount} tes ({netCount > 0 ? Math.round((slowCount / netCount) * 100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-red-500 h-full rounded-full transition-all" style={{ width: `${netCount > 0 ? (slowCount / netCount) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Suitability Cards */}
              <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-5 space-y-3.5`}>
                <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'} flex items-center gap-2`}>
                  <CheckCheck className="w-4 h-4 text-cyan-400" />
                  <span>Kesiapan Penggunaan Aplikasi Populer</span>
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                    <span className="text-slate-400 font-medium">💬 WhatsApp Call & Chat</span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-lg font-black text-emerald-400">{passWhatsAppRate}%</span>
                      <span className="text-[10px] text-emerald-300 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/30">Lancar</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1">Min. 2 Mbps</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                    <span className="text-slate-400 font-medium">▶️ YouTube Video 1080p</span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-lg font-black text-blue-400">{passYouTubeRate}%</span>
                      <span className="text-[10px] text-blue-300 bg-blue-950 px-1.5 py-0.5 rounded border border-blue-500/30">Streaming OK</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1">Min. 15 Mbps</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                    <span className="text-slate-400 font-medium">📱 TikTok & Instagram</span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-lg font-black text-purple-400">{passTikTokRate}%</span>
                      <span className="text-[10px] text-purple-300 bg-purple-950 px-1.5 py-0.5 rounded border border-purple-500/30">Lancar</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1">Min. 10 Mbps</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                    <span className="text-slate-400 font-medium">🔍 Google Maps & Web</span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-lg font-black text-cyan-400">100%</span>
                      <span className="text-[10px] text-cyan-300 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-500/30">Optimal</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1">Min. 3 Mbps</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3`}>
              <div className="flex items-center gap-3 flex-1 min-w-[260px] flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={networkSearch}
                    onChange={(e) => setNetworkSearch(e.target.value)}
                    placeholder="Cari penguji, tipe jaringan, atau ID..."
                    className={`w-full pl-9 pr-8 py-2 text-xs rounded-xl border font-medium ${
                      isDarkMode
                        ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-cyan-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-500'
                    } focus:outline-none`}
                  />
                  {networkSearch && (
                    <button
                      onClick={() => setNetworkSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter Tipe Jaringan */}
                <select
                  value={networkFilterType}
                  onChange={(e) => setNetworkFilterType(e.target.value)}
                  className={`text-xs px-3 py-2 rounded-xl border font-medium cursor-pointer ${
                    isDarkMode
                      ? 'bg-slate-950 border-slate-800 text-slate-200'
                      : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="ALL">Semua Tipe Jaringan ({networkLogsList.length})</option>
                  <option value="4G LTE">4G LTE</option>
                  <option value="5G">5G</option>
                  <option value="Wi-Fi">Wi-Fi</option>
                </select>
              </div>

              <div className="text-xs text-slate-400 font-medium">
                Menampilkan <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{filteredNetworkLogs.length}</span> dari {networkLogsList.length} rekaman uji
              </div>
            </div>

            {/* Main Table / Data List */}
            <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl overflow-hidden`}>
              {filteredNetworkLogs.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Activity className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p className="text-sm font-semibold">Belum Ada Catatan Tes Jaringan</p>
                  <p className="text-xs max-w-md mx-auto text-slate-500">
                    {networkSearch || networkFilterType !== 'ALL'
                      ? 'Tidak ada data pengujian yang sesuai dengan kata kunci pencarian Anda.'
                      : 'Hasil uji dari modul Network Check promotor di lapangan akan otomatis tersimpan dan tertampil di tabel ini.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`${isDarkMode ? 'bg-slate-950/70 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'} border-b font-semibold uppercase tracking-wider text-[10px]`}>
                        <th className="py-3 px-4 w-12 text-center">No</th>
                        <th className="py-3 px-4">Waktu Uji</th>
                        <th className="py-3 px-4">Penguji / Promotor</th>
                        <th className="py-3 px-4">Download (Mbps)</th>
                        <th className="py-3 px-4">Upload (Mbps)</th>
                        <th className="py-3 px-4">Latency (Ping)</th>
                        <th className="py-3 px-4">Jitter</th>
                        <th className="py-3 px-4">Tipe Jaringan</th>
                        <th className="py-3 px-4">Koordinat GPS</th>
                        <th className="py-3 px-4 text-center w-20">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                      {filteredNetworkLogs.map((log, index) => (
                        <tr
                          key={log.id}
                          className={`${isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'} transition-colors`}
                        >
                          {/* No */}
                          <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                            {index + 1}
                          </td>

                          {/* Waktu Uji */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-slate-300">
                            <div>{new Date(log.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                            <div className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>

                          {/* Penguji / Promotor */}
                          <td className="py-3.5 px-4">
                            <div className={`font-semibold text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {log.promoterName || 'Promoter Lapangan'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {log.promoterEmail || '-'}
                            </div>
                          </td>

                          {/* Download */}
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-full text-xs border ${
                              log.downloadMbps >= 40
                                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                                : log.downloadMbps >= 20
                                ? 'bg-blue-950/70 text-blue-300 border-blue-500/40'
                                : 'bg-amber-950/70 text-amber-300 border-amber-500/40'
                            }`}>
                              ⬇ {log.downloadMbps.toFixed(1)} Mbps
                            </span>
                          </td>

                          {/* Upload */}
                          <td className="py-3.5 px-4">
                            <span className="font-mono text-blue-400 font-semibold text-xs">
                              ⬆ {log.uploadMbps.toFixed(1)} Mbps
                            </span>
                          </td>

                          {/* Ping */}
                          <td className="py-3.5 px-4">
                            <span className={`font-mono text-xs font-semibold ${
                              log.latencyMs <= 25 ? 'text-emerald-400' : log.latencyMs <= 45 ? 'text-amber-400' : 'text-rose-400'
                            }`}>
                              {log.latencyMs} ms
                            </span>
                          </td>

                          {/* Jitter */}
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                            ±{log.jitterMs} ms
                          </td>

                          {/* Tipe Jaringan */}
                          <td className="py-3.5 px-4">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                              log.networkType.includes('5G')
                                ? 'bg-purple-950 text-purple-300 border-purple-500/40'
                                : 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
                            }`}>
                              {log.networkType}
                            </span>
                          </td>

                          {/* Lokasi GPS */}
                          <td className="py-3.5 px-4">
                            {log.location ? (
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] text-emerald-400">
                                  {log.location.lat.toFixed(4)}, {log.location.lng.toFixed(4)}
                                </span>
                                <button
                                  onClick={() => handleCopyNetCoordinates(log.id, log.location!.lat, log.location!.lng)}
                                  className="text-blue-400 hover:text-blue-300 cursor-pointer"
                                  title="Salin Koordinat"
                                >
                                  {copiedNetCoordId === log.id ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <a
                                  href={`https://www.google.com/maps?q=${log.location.lat},${log.location.lng}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-amber-400 hover:text-amber-300"
                                  title="Buka Google Maps"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            ) : (
                              <span className="italic text-slate-500 text-[11px]">GPS tidak diaktifkan</span>
                            )}
                          </td>

                          {/* Aksi */}
                          <td className="py-3.5 px-4 text-center">
                            {user.role === 'ADMIN' ? (
                              <button
                                onClick={() => handleDeleteNetworkLog(log.id)}
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition cursor-pointer"
                                title="Hapus Catatan Tes"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-slate-600 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT USER */}
      {isAddUserModalOpen && (
        <div
          className="fixed inset-0 z-[99999] isolate flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          style={{ zIndex: 99999 }}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span>{editingUser ? 'Edit Pengguna & Hak Akses' : 'Tambah Pengguna Baru'}</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Konfigurasi role akun untuk mengatur batasan visibilitas wilayah dan hak edit.
            </p>

            <form onSubmit={handleSaveUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={userFormData.name}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email / Username / Sales Code Login
                </label>
                <input
                  type="text"
                  required
                  value={userFormData.email}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Contoh: budi@xlsmart.co.id atau HARPA"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Role Akses
                  </label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => {
                      const newRole = e.target.value as any;
                      let defaultScope = userFormData.scope;
                      if (newRole === 'ADMIN' || newRole === 'NASIONAL_MANAGER') defaultScope = 'NASIONAL';
                      else if (newRole === 'REGION') defaultScope = 'EAST JAVA';
                      else if (newRole === 'CITY') defaultScope = 'KAB. BANGKALAN';
                      else defaultScope = 'HARPA';

                      setUserFormData(prev => ({ ...prev, role: newRole, scope: defaultScope }));
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="ADMIN">Super Admin (Akses Penuh)</option>
                    <option value="NASIONAL_MANAGER">Nasional Manager (Seluruh Wilayah - Read Only)</option>
                    <option value="REGION">Regional Manager (Scope Region)</option>
                    <option value="CITY">City Specialist (Scope City)</option>
                    <option value="PROMOTER">Sales Promoter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Status Akun
                  </label>
                  <select
                    value={userFormData.status}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="ACTIVE">Aktif (Bisa Login)</option>
                    <option value="INACTIVE">Nonaktif (Suspend)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Wilayah Cakupan (Scope / Kota / Region)
                </label>
                <input
                  type="text"
                  required
                  value={userFormData.scope}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, scope: e.target.value }))}
                  placeholder="Contoh: KAB. BANGKALAN atau BALI NUSRA"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password Baru {editingUser && '(Kosongkan jika tidak diubah)'}
                </label>
                <input
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Default: 123456"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{loading ? 'Menyimpan...' : 'Simpan User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT GRID */}
      <GridEditModal
        isOpen={isAddGridModalOpen}
        grid={editingGrid}
        onClose={() => setIsAddGridModalOpen(false)}
        onSave={handleSaveGridFromModal}
      />

      {/* MODAL: ADD / EDIT POI */}
      {isAddPoiModalOpen && (
        <div
          className="fixed inset-0 z-[99999] isolate flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto"
          style={{ zIndex: 99999 }}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-purple-400" />
                  <span>{editingPoi ? 'Edit Data POI (12 Field Schema)' : 'Tambah POI Baru (12 Field Schema)'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Format standar master: Meta Grid ID, REGION, PROVINCE, XLS CITY, KECAMATAN, POI_ID, POI_NAME_RAW, POI_NAME, TAXON_NAME_RAW, TAXON_NAME, LATITUDE, LONGITUDE.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPoiModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePoi} className="space-y-4">
              {/* Bagian 1: Identifikasi & Grid */}
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-3">
                <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                  1. Identitas & Asosiasi Grid
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      POI_ID <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={poiFormData.POI_ID}
                      onChange={(e) => setPoiFormData(prev => ({ ...prev, POI_ID: e.target.value }))}
                      placeholder="Contoh: POI-BKL-0001"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Meta Grid ID <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={poiFormData['Meta Grid ID']}
                      onChange={(e) => setPoiFormData(prev => ({ ...prev, 'Meta Grid ID': e.target.value }))}
                      placeholder="Contoh: 3526001000"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Bagian 2: Nama POI (Clean & Raw) */}
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-3">
                <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                  2. Nama Titik POI (Clean & Raw)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      POI_NAME (Tampilan Standar) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={poiFormData.POI_NAME}
                      onChange={(e) => setPoiFormData(prev => ({ ...prev, POI_NAME: e.target.value }))}
                      placeholder="Contoh: Pasar Tradisional Socah"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      POI_NAME_RAW (Data Mentah/Sumber)
                    </label>
                    <input
                      type="text"
                      value={poiFormData.POI_NAME_RAW}
                      onChange={(e) => setPoiFormData(prev => ({ ...prev, POI_NAME_RAW: e.target.value }))}
                      placeholder="Contoh: PASAR TRADISIONAL SOCAH SENTRAL"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Bagian 3: Kategori / Taxon */}
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-3">
                <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                  3. Kategori Taxon (Clean & Raw)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      TAXON_NAME (Kategori Standar)
                    </label>
                    <select
                      value={poiFormData.TAXON_NAME}
                      onChange={(e) => setPoiFormData(prev => ({ ...prev, TAXON_NAME: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="Traditional Market">Traditional Market</option>
                      <option value="Modern Outlet">Modern Outlet</option>
                      <option value="Device Store">Device Store</option>
                      <option value="School/Campus">School/Campus</option>
                      <option value="Transportation">Transportation</option>
                      <option value="Government">Government</option>
                      <option value="Store Cluster">Store Cluster</option>
                      <option value="Public Facility">Public Facility</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      TAXON_NAME_RAW (Kategori Sumber)
                    </label>
                    <input
                      type="text"
                      value={poiFormData.TAXON_NAME_RAW}
                      onChange={(e) => setPoiFormData(prev => ({ ...prev, TAXON_NAME_RAW: e.target.value }))}
                      placeholder="Contoh: Traditional Market & Groceries"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Bagian 4: Lokasi Administratif */}
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-3">
                <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                  4. Wilayah Administratif
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      KECAMATAN
                    </label>
                    <input
                      type="text"
                      required
                      value={poiFormData.KECAMATAN}
                      onChange={(e) => setPoiFormData(prev => ({ ...prev, KECAMATAN: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      XLS CITY
                    </label>
                    <input
                      type="text"
                      required
                      value={poiFormData['XLS CITY']}
                      onChange={(e) => setPoiFormData(prev => ({ ...prev, 'XLS CITY': e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      PROVINCE
                    </label>
                    <input
                      type="text"
                      required
                      value={poiFormData.PROVINCE}
                      onChange={(e) => setPoiFormData(prev => ({ ...prev, PROVINCE: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      REGION
                    </label>
                    <input
                      type="text"
                      required
                      value={poiFormData.REGION}
                      onChange={(e) => setPoiFormData(prev => ({ ...prev, REGION: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Bagian 5: Koordinat Geospasial */}
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-3">
                <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                  5. Titik Koordinat (LATITUDE, LONGITUDE)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      LATITUDE <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      value={poiFormData.LATITUDE}
                      onChange={(e) => setPoiFormData(prev => ({ ...prev, LATITUDE: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      LONGITUDE <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      value={poiFormData.LONGITUDE}
                      onChange={(e) => setPoiFormData(prev => ({ ...prev, LONGITUDE: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddPoiModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{loading ? 'Menyimpan...' : 'Simpan Data POI Master'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE NEW FOLDER */}
      {isAddFolderModalOpen && (
        <div
          className="fixed inset-0 z-[99999] isolate flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          style={{ zIndex: 99999 }}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Folder className="w-4 h-4 text-amber-400" />
              <span>Buat Folder Dataset Baru</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Folder terisolasi untuk mengelompokkan data per kuartal, tahun, atau wilayah baru.
            </p>

            <form onSubmit={handleCreateFolder} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Folder
                </label>
                <input
                  type="text"
                  required
                  value={folderFormData.name}
                  onChange={(e) => setFolderFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Contoh: Dataset Q2 2026 - Jawa Timur"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tanggal Rilis Data
                  </label>
                  <input
                    type="date"
                    value={folderFormData.dataDate}
                    onChange={(e) => setFolderFormData(prev => ({ ...prev, dataDate: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Label Periode
                  </label>
                  <input
                    type="text"
                    value={folderFormData.period}
                    onChange={(e) => setFolderFormData(prev => ({ ...prev, period: e.target.value }))}
                    placeholder="Q1 2026"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Deskripsi Singkat
                </label>
                <textarea
                  rows={2}
                  value={folderFormData.description}
                  onChange={(e) => setFolderFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Deskripsi target operasional..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddFolderModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{loading ? 'Membuat...' : 'Buat Folder'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT BTS (16 FIELDS) */}
      <BTSEditModal
        isOpen={isBTSEditModalOpen}
        bts={editingBTS}
        onClose={() => {
          setIsBTSEditModalOpen(false);
          setEditingBTS(null);
        }}
        onSave={handleSaveBTS}
        onDelete={async (id) => {
          await handleDeleteBTS(id, editingBTS?.sitename || id);
        }}
      />

      {/* MODAL: VIEW FULL PHOTO LIGHTBOX (POI SURVEY) */}
      {activePhotoModal && (
        <div className="fixed inset-0 z-[99999] isolate bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-blue-400" />
                <span>Foto Bukti Survei POI</span>
              </span>
              <button
                onClick={() => setActivePhotoModal(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white rounded-full p-1.5 cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black min-h-[300px]">
              <img src={activePhotoModal} alt="Preview Foto" className="max-h-[80vh] w-auto object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL POI LOG SUBMISSION */}
      {selectedPoiLogDetail && (
        <div className="fixed inset-0 z-[99999] isolate bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-400" />
                  <span>{selectedPoiLogDetail.poiName || 'Detail Laporan Formulir POI'}</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">ID: {selectedPoiLogDetail.id}</span>
              </div>
              <button
                onClick={() => setSelectedPoiLogDetail(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Kategori POI</span>
                <span className="font-semibold text-white">{selectedPoiLogDetail.poiCategory || '-'}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Promotor Pengisi</span>
                <span className="font-semibold text-white">{selectedPoiLogDetail.promoterName} ({selectedPoiLogDetail.promoterEmail || '-'})</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Koordinat Satelit GPS</span>
                <span className="font-mono text-emerald-400 font-semibold">{selectedPoiLogDetail.location.lat.toFixed(6)}, {selectedPoiLogDetail.location.lng.toFixed(6)}</span>
                {selectedPoiLogDetail.location.accuracy && (
                  <span className="text-slate-400 text-[10px] block">Akurasi: ±{selectedPoiLogDetail.location.accuracy}m</span>
                )}
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Waktu Submit</span>
                <span className="text-white font-medium">{new Date(selectedPoiLogDetail.createdAt).toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Catatan */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Catatan Lapangan</span>
              <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                {selectedPoiLogDetail.notes || <span className="italic text-slate-500">Tidak ada catatan lapangan yang disertakan.</span>}
              </p>
            </div>

            {/* Foto Galeri */}
            {selectedPoiLogDetail.photos && selectedPoiLogDetail.photos.length > 0 && (
              <div>
                <span className="text-xs font-bold text-slate-300 block mb-2">
                  Foto Dokumentasi Lapangan ({selectedPoiLogDetail.photos.length})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {selectedPoiLogDetail.photos.map((photo, i) => (
                    <div
                      key={i}
                      onClick={() => setActivePhotoModal(photo)}
                      className="aspect-square rounded-xl overflow-hidden border border-slate-700 bg-black cursor-pointer hover:border-blue-500 transition relative group"
                    >
                      <img src={photo} alt={`Foto ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <Eye className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-800 flex-wrap gap-2">
              <button
                onClick={() => handleDeletePoiLog(selectedPoiLogDetail.id)}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Laporan</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyCoordinates(selectedPoiLogDetail.id, selectedPoiLogDetail.location.lat, selectedPoiLogDetail.location.lng)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Koordinat</span>
                </button>
                <a
                  href={`https://www.google.com/maps?q=${selectedPoiLogDetail.location.lat},${selectedPoiLogDetail.location.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Google Maps</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
