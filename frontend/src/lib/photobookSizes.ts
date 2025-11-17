import type { PhotobookSize } from '@/types';

// Typical photobook size (e.g., 210x210 mm square)
export const DEFAULT_PHOTOBOOK_SIZE: PhotobookSize = {
	width: 210,
	height: 210,
	basePrice: 2500,
	additionalPagePrice: 80
};

// Minimum total pages constraint (e.g., 20 pages)
export const MIN_PAGES = 20;

