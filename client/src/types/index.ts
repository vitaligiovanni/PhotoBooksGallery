export interface CartItem {
  id: string;
  name: string;
  price: number;
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
