import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { Product } from '@shared/schema';

export interface CatalogPathEntity {
  id: string;
  slug: string;
  name: string;
  description?: string;
  parentId?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
}

export interface CatalogPathResponse {
  category: CatalogPathEntity | null;
  subcategory?: CatalogPathEntity | null;
  products: Product[];
  breadcrumbs: Array<{ type: 'category' | 'subcategory'; id: string; name: string; slug: string }>;
  children?: CatalogPathEntity[];
  siblings?: CatalogPathEntity[];
  counts: { products: number; children: number };
}

interface UseCatalogPathOptions {
  categorySlug?: string;
  subcategorySlug?: string;
  enabled?: boolean; // external toggle
}

export function useCatalogPath({ categorySlug, subcategorySlug, enabled = true }: UseCatalogPathOptions) {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'ru';

  const hasCategory = !!categorySlug;

  const query = useQuery<CatalogPathResponse>({
    queryKey: ['catalog-path', lang, categorySlug, subcategorySlug],
    enabled: enabled && hasCategory,
    queryFn: async () => {
      if (!categorySlug) throw new Error('categorySlug required');
      const url = `/api/catalog/${encodeURIComponent(categorySlug)}${subcategorySlug ? '/' + encodeURIComponent(subcategorySlug) : ''}?lang=${lang}`;
      const res = await fetch(url);
      if (!res.ok) {
        let detail: any = null;
        try { detail = await res.json(); } catch {}
        const msg = detail?.message || `Failed to load catalog path (${res.status})`;
        throw new Error(msg);
      }
      return res.json();
    }
  });

  return {
    lang,
    hasCategory,
    ...query,
  };
}
