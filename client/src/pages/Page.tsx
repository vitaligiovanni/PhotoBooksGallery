import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageRenderer } from '@/components/constructor/PageRenderer';
import { BlockType } from '@shared/schema';

export function Page() {
  // Получаем slug из URL
  const slug = window.location.pathname.split('/').pop() || '';

  const { data: pageData, isLoading, error } = useQuery({
    queryKey: ['page', slug],
    queryFn: async () => {
      const response = await fetch(`/api/constructor/pages/${slug}`);
      if (!response.ok) {
        throw new Error('Page not found');
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !pageData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">404 - Страница не найдена</h1>
          <p className="text-gray-600">Страница "{slug}" не существует</p>
        </div>
      </div>
    );
  }

  const { page, blocks } = pageData;

  return <PageRenderer page={page} blocks={blocks} />;
}
