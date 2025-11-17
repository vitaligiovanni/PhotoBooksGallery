import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Page, Block } from '@shared/schema';
import { HeroBlockRenderer } from './renderers/HeroBlockRenderer';
import { TextBlockRenderer } from './renderers/TextBlockRenderer';
import { ImageBlockRenderer } from './renderers/ImageBlockRenderer';
import { GalleryBlockRenderer } from './renderers/GalleryBlockRenderer';
import { ButtonBlockRenderer } from './renderers/ButtonBlockRenderer';
import { CategoriesBlockRenderer } from './renderers/CategoriesBlockRenderer';

interface PageRendererProps {
  page: ExtendedPage;
  blocks: Block[];
}

interface PageTitle {
  ru?: string;
  en?: string;
  hy?: string;
}

interface PageDescription {
  ru?: string;
  en?: string;
  hy?: string;
}

interface ExtendedPage extends Omit<Page, 'title' | 'description'> {
  title?: PageTitle;
  description?: PageDescription;
}

export function PageRenderer({ page, blocks }: PageRendererProps) {
  // Generate SEO meta tags
  const generateMetaTags = () => {
    const metaTags = [];

    // Basic meta tags
    if (page.metaTitle) {
      metaTags.push(
        <title key="title">{page.metaTitle}</title>,
        <meta key="og:title" property="og:title" content={page.metaTitle} />,
        <meta key="twitter:title" name="twitter:title" content={page.metaTitle} />
      );
    }

    if (page.metaDescription) {
      metaTags.push(
        <meta key="description" name="description" content={page.metaDescription} />,
        <meta key="og:description" property="og:description" content={page.metaDescription} />,
        <meta key="twitter:description" name="twitter:description" content={page.metaDescription} />
      );
    }

    if (page.keywords) {
      metaTags.push(
        <meta key="keywords" name="keywords" content={page.keywords} />
      );
    }

    if (page.canonicalUrl) {
      metaTags.push(
        <link key="canonical" rel="canonical" href={page.canonicalUrl} />
      );
    }

    // Open Graph
    metaTags.push(
      <meta key="og:type" property="og:type" content="website" />,
      <meta key="og:url" property="og:url" content={window.location.href} />,
      <meta key="og:site_name" property="og:site_name" content="PhotoBooksGallery" />
    );

    if (page.ogImage) {
      metaTags.push(
        <meta key="og:image" property="og:image" content={page.ogImage} />,
        <meta key="og:image:width" property="og:image:width" content="1200" />,
        <meta key="og:image:height" property="og:image:height" content="630" />
      );
    }

    // Twitter Card
    metaTags.push(
      <meta key="twitter:card" name="twitter:card" content={page.twitterCard || 'summary_large_image'} />,
      <meta key="twitter:site" name="twitter:site" content="@photobooksgallery" />
    );

    // Language
    if (page.language) {
      metaTags.push(
        <meta key="language" httpEquiv="content-language" content={page.language} />
      );
    }

    // Noindex
    if (page.noindex) {
      metaTags.push(
        <meta key="robots" name="robots" content="noindex,nofollow" />
      );
    }

    // Structured Data (JSON-LD)
    if (page.structuredData) {
      metaTags.push(
        <script key="structured-data" type="application/ld+json">
          {JSON.stringify(page.structuredData)}
        </script>
      );
    }

    return metaTags;
  };

  // Render block based on type
  const renderBlock = (block: Block) => {
    const commonProps = {
      key: block.id,
      block,
    };

    switch (block.type) {
      case 'hero':
        return <HeroBlockRenderer {...commonProps} />;
      case 'text':
        return <TextBlockRenderer {...commonProps} />;
      case 'image':
        return <ImageBlockRenderer {...commonProps} />;
      case 'gallery':
        return <GalleryBlockRenderer {...commonProps} />;
      case 'button':
        return <ButtonBlockRenderer {...commonProps} />;
      case 'categories':
        return <CategoriesBlockRenderer {...commonProps} />;
      default:
        return (
          <div key={block.id} className="p-4 border border-dashed border-gray-300 rounded">
            <p className="text-gray-500">Блок типа "{block.type}" не поддерживается</p>
          </div>
        );
    }
  };

  return (
    <>
      <Helmet>
        {generateMetaTags()}
      </Helmet>

      <div className="page-renderer">
        {/* Page Header */}
        <header className="page-header mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {(page.title as any)?.ru || page.slug}
          </h1>
          {page.description && (
            <p className="text-gray-600 text-lg">
              {(page.description as any)?.ru}
            </p>
          )}
        </header>

        {/* Page Blocks */}
        <div className="page-blocks space-y-8">
          {blocks
            .filter(block => block.isActive)
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
            .map(renderBlock)}
        </div>
      </div>
    </>
  );
}