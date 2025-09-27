export interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  quantity: number;
  imageUrl?: string;
  options?: Record<string, any>;
}

export interface CartState {
  items: CartItem[];
  total: number;
  isOpen: boolean;
}

export interface LocalizedText {
  ru: string;
  hy: string;
  en: string;
}

export interface PhotoEditorState {
  photos: File[];
  currentSpread: number;
  spreads: PhotoSpread[];
}

export interface PhotoSpread {
  id: string;
  photos: {
    id: string;
    file: File;
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
}

// ===== Photobook domain types (restored) =====
export interface PhotobookSize {
  width: number;                // page width in mm or arbitrary units
  height: number;               // page height in mm or arbitrary units
  basePrice: number;            // base price for minimum pages
  additionalPagePrice: number;  // price per additional page
}

export interface PhotoElement {
  id: string;
  type: 'photo';
  position: { x: number; y: number };   // percent (0-100)
  size: { width: number; height: number }; // percent (0-100)
  photoUrl: string;
  crop: { x: number; y: number; width: number; height: number }; // ratios 0-1
  rotation?: number;
  zIndex?: number;
}

export interface PhotobookPage {
  id: string;
  elements: PhotoElement[];
  background: { type: 'color'; value: string };
}

export interface PhotobookSpread {
  id: string;
  spreadNumber: number;
  leftPage: PhotobookPage;
  rightPage: PhotobookPage;
}

export interface PhotobookProject {
  id: string;
  title: string;
  size: PhotobookSize;
  spreads: PhotobookSpread[];
  totalPages: number;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'final' | string;
}

export interface QuickPreviewState {
  photos: File[];
  previewSpreads: PhotobookSpread[];
  isGenerating: boolean;
  showPreview: boolean;
}
