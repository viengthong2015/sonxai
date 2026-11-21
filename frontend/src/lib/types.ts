export type Lang = 'en' | 'lo';
export type Localized = Partial<Record<Lang, string>>;

export type BlockType =
  | 'hero'
  | 'page_header'
  | 'stats'
  | 'cards'
  | 'cta'
  | 'rich_text'
  | 'image_text'
  | 'partners'
  | 'enrollment_form';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BlockData = Record<string, any>;

export interface SiteSettings {
  site_name: Localized;
  site_tagline: Localized;
  logo_icon: string;
  logo_image_url: string;
  footer_name: Localized;
  footer_text: Localized;
  contact_email: string;
  contact_phone: string;
  contact_address: Localized;
  facebook_url: string;
  youtube_url: string;
  show_dashboard_button: boolean;
  dashboard_label: Localized;
  apply_title: Localized;
  apply_subtitle: Localized;
  grades: { label: Localized }[];
  meta_description: Localized;
  [key: string]: unknown;
}

export interface NavItem {
  slug: string;
  label: Localized;
  menu_type: 'page' | 'link';
  url: string | null;
  open_in_new_tab: boolean;
  is_home: boolean;
}

export interface SiteData {
  settings: SiteSettings;
  nav: NavItem[];
  home_slug: string | null;
  published_at: string | null;
}

export interface PageBlock {
  id: number;
  block_type: BlockType;
  data: BlockData;
}

export interface PageData {
  slug: string;
  label: Localized;
  meta_description: Localized;
  is_home: boolean;
  blocks: PageBlock[];
}

/* ---------------------------------------------------------------- admin */
export interface User {
  id: number;
  username: string;
  full_name: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface Menu {
  id: number;
  slug: string;
  label: Localized;
  menu_type: 'page' | 'link';
  url: string | null;
  open_in_new_tab: boolean;
  is_home: boolean;
  is_visible: boolean;
  show_in_nav: boolean;
  sort_order: number;
  meta_description: Localized;
  block_count: number;
  updated_at: string;
}

export type MenuInput = Omit<Menu, 'id' | 'sort_order' | 'block_count' | 'updated_at'>;

export interface Block {
  id: number;
  menu_id: number;
  block_type: BlockType;
  data: BlockData;
  is_visible: boolean;
  sort_order: number;
  updated_at: string;
}

export interface PublishStatus {
  has_changes: boolean;
  never_published: boolean;
  added: string[];
  removed: string[];
  modified: string[];
  settings_changed: boolean;
  order_changed: boolean;
  last_published_at: string | null;
  last_published_by: string | null;
  last_publication_id: number | null;
}

export interface Publication {
  id: number;
  note: string;
  published_at: string;
  published_by: string | null;
  page_count: number;
  is_live: boolean;
}

export type ApplicationStatus = 'new' | 'contacted' | 'enrolled' | 'archived';

export interface Application {
  id: number;
  parent_name: string;
  phone: string;
  child_name: string;
  grade: string;
  message: string;
  status: ApplicationStatus;
  admin_notes: string;
  created_at: string;
  updated_at: string;
}

export interface MediaItem {
  id: number;
  url: string;
  original_name: string;
  content_type: string;
  size: number;
  created_at: string;
}

export interface DashboardData {
  menus: number;
  pages: number;
  blocks: number;
  applications_new: number;
  applications_total: number;
  has_changes: boolean;
  last_published_at: string | null;
  recent_applications: Application[];
}
