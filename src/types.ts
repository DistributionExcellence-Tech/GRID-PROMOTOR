export type GridCategory =
  | '1st Priority Acquisition'
  | '2nd Priority Acquisition'
  | '3rd Priority'
  | 'Avoid Cannibalism';

export type RevenueFlag =
  | 'Rev >40 Mn'
  | 'Rev 30-40 Mn'
  | 'Rev 20-30 Mn'
  | 'Rev <20 Mn'
  | 'Rev 0'
  | 'Unknown';

export interface GridItem {
  // 23 Exact Database Headers requested by user:
  GRID_ID: string;
  REGION: string;
  PROVINCE: string;
  CITY: string;
  KECAMATAN: string;
  'SF Grid Category': GridCategory | string;
  'Mapping Promotor': string;
  'Center Long': number;
  'Center Lat': number;
  'Geometry WKT': string;
  geometry?: any;
  POPULATION: number;
  'MS_XLCo.': number | string;
  MS_SF: number | string;
  MS_IM3: number | string;
  MS_3TRI: number | string;
  MS_TSEL: number | string;
  MS_XLS: number | string;
  MS_IOH: number | string;
  P10_DL_Speed_XLCo: number | string;
  P10_DL_Speed_SF: number | string;
  TOTAL_POI: number;
  TOTAL_BTS: number;
  TOTAL_BTS_RESIDENTIAL: number;

  // Normalized / backward-compatibility aliases:
  id: string;
  sitename?: string;
  site_type?: string;
  Province?: string;
  City?: string;
  Kecamatan?: string;
  Region?: string;
  latitude: number;
  longitude: number;
  GRID_META_ID?: string;
  Rev_August_2026?: number | string;
  Revenue_Flag?: RevenueFlag | string;
  SF_Grid_Category: GridCategory;
  Geometry_WKT: string;
  Device_Status?: 'Active' | 'Normal' | 'High Load' | 'Degraded' | 'Under Maintenance' | 'Offline' | string;

  region: string;
  province: string;
  city: string;
  kecamatan: string;
  cat: GridCategory;
  bounds: [[number, number], [number, number]]; // [[south, west], [north, east]]
  center: [number, number]; // [lat, lng]
  pop?: number;
  tsel?: string;
  xlco?: string;
  ioh?: string;
  sf?: string;
  xl?: string;
  bts?: number;
  poi?: number;
  prom?: 'MULTIBRAND' | 'SINGLEBRAND' | 'DIRECT' | 'HYBRID' | string;

  // Dynamic / master fields & raw excel aliases:
  [key: string]: any;
}

export interface BTSItem {
  // Required attributes requested by user:
  id: string;
  sitename: string;
  'Aging (Month)': number | string;
  site_type: string;
  'Site Function': string;
  Province: string;
  City: string;
  Kecamatan: string;
  latitude: number;
  ongitude: number;
  Region: string;
  GRID_META_ID: string;
  'Rev.2026': number | string;
  'Revenue Flag': RevenueFlag | string;
  'BSP Data': string;
  'Geometry WKT': string;

  // Normalized / backward-compatibility aliases:
  name?: string;
  aging_month?: number | string;
  site_function?: string;
  func?: 'Residential' | 'Commercial' | 'Industrial' | 'Highway' | 'Education' | string;
  type?: 'Macro' | 'Micro' | 'Small Cell' | 'Pole' | 'Inbuilding' | string;
  region?: string;
  province?: string;
  city?: string;
  kec?: string;
  lat?: number;
  lng?: number;
  longitude?: number;
  grid?: string;
  gridId?: string;
  Rev_2026?: number | string;
  rev?: RevenueFlag;
  Revenue_Flag?: RevenueFlag | string;
  revenue_flag?: string;
  bsp_data?: string;
  Geometry_WKT?: string;
  tenants?: string[];
  heightMeters?: number;

  // Additional dynamic/master fields & raw excel aliases:
  [key: string]: any;
}

export interface POIItem {
  // Standard POI headers:
  // Meta Grid ID,REGION,PROVINCE,XLS CITY,KECAMATAN,POI_ID,POI_NAME_RAW,POI_NAME,TAXON_NAME_RAW,TAXON_NAME,LATITUDE,LONGITUDE
  'Meta Grid ID': string;
  REGION: string;
  PROVINCE: string;
  'XLS CITY': string;
  KECAMATAN: string;
  POI_ID: string;
  POI_NAME_RAW: string;
  POI_NAME: string;
  TAXON_NAME_RAW: string;
  TAXON_NAME: string;
  LATITUDE: number;
  LONGITUDE: number;

  // Single combined alias support if literally provided
  'TAXON_NAME_RAW TAXON_NAME'?: string;

  // Backward compatibility / convenience aliases:
  id: string;
  name: string;
  type: string;
  city?: string;
  kec?: string;
  kecamatan?: string;
  province?: string;
  region?: string;
  grid?: string;
  gridId?: string;
  lat: number;
  lng: number;
  latitude?: number;
  longitude?: number;
  poi_id?: string;
  poi_name?: string;
  poi_name_raw?: string;
  taxon_name?: string;
  taxon_name_raw?: string;
}

export type UserRole = 'ADMIN' | 'NASIONAL_MANAGER' | 'REGION' | 'CITY' | 'PROMOTER';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  scope: string; // e.g. 'NASIONAL', 'BALI NUSRA', 'KAB. BANGKALAN', 'HARPA'
  email: string;
  password?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
}

export interface FilterState {
  region: string;
  province: string;
  city: string;
  kecamatan: string;
  searchMode: 'grid' | 'bts';
  searchQuery: string;
  categories: Record<GridCategory, boolean>;
}

export interface GeoHierarchy {
  [region: string]: {
    [province: string]: {
      [city: string]: string[];
    };
  };
}

export interface KPIData {
  towerCount: number;
  gridCount: number;
  poiCount?: number;
  p1Count: number;
  p2Count: number;
  p3Count: number;
  cannibalCount: number;
}

export interface FolderFileItem {
  id: string;
  name: string;
  type: 'grid' | 'bts' | 'poi' | 'raw';
  size: number;
  uploadedAt: string;
  recordCount: number;
}

export interface DatasetFolder {
  id: string;
  name: string;
  description?: string;
  region?: string;
  province?: string;
  city?: string;
  dataDate?: string; // e.g. "2026-03-22"
  period?: string; // e.g. "Q1 2026" or "Maret 2026"
  createdAt: string;
  updatedAt: string;
  gridCount: number;
  btsCount: number;
  poiCount: number;
  isActive: boolean;
  files: FolderFileItem[];
}

export type AppModule = 'grid' | 'form_poi' | 'network_check';

export interface POIUpdateRecord {
  id: string;
  promoterId: string;
  promoterName: string;
  promoterEmail: string;
  location: {
    lat: number;
    lng: number;
    accuracy?: number;
    address?: string;
  };
  photos: string[]; // Base64 data URLs or image URLs
  notes: string;
  poiName?: string;
  poiCategory?: string;
  gridId?: string;
  customerData?: {
    customerName?: string;
    phone?: string;
    msisdn?: string;
    serviceType?: string;
  };
  createdAt: string;
}

export interface SpeedTestResult {
  id: string;
  timestamp: string;
  downloadMbps: number;
  uploadMbps: number;
  latencyMs: number;
  jitterMs: number;
  networkType: string; // e.g. "4G", "LTE", "5G", "Wi-Fi"
  location?: { lat: number; lng: number };
  serviceChecks?: Record<string, { status: 'OK' | 'Slow' | 'Failed'; latencyMs: number }>;
  promoterName?: string;
  promoterEmail?: string;
}
