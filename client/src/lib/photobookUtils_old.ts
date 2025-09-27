import type { 
  PhotobookProject, 
  PhotobookSpread, 
  PhotobookPage, 
  PhotoElement, 
  PhotobookSize,
  QuickPreviewState 
} from '@/types';
import { DEFAULT_PHOTOBOOK_SIZE, MIN_PAGES } from './photobookSizes';
import { exifr } from 'exifr';
import * as faceapi from 'face-api.js';

// Интерфейс для фотографии с метаданными
interface PhotoWithMetadata {
  file: File;
  url: string;
  dateTaken?: Date;
  dimensions?: { width: number; height: number };
  faces?: FaceData[];
}

interface FaceData {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

// Шаблоны коллажей для разворотов
interface CollageTemplate {
  id: string;
  name: string;
  maxPhotos: number;
  photoZones: Array<{
    x: number; // позиция в процентах
    y: number;
    width: number;
    height: number;
    aspectRatio?: 'portrait' | 'landscape' | 'square';
  }>;
}

const COLLAGE_TEMPLATES: CollageTemplate[] = [
  // Одиночные фото
  {
    id: 'single-left',
    name: 'Одно фото слева',
    maxPhotos: 1,
    photoZones: [
      { x: 15, y: 20, width: 35, height: 60 }
    ]
  },
  {
    id: 'single-right',
    name: 'Одно фото справа',
    maxPhotos: 1,
    photoZones: [
      { x: 65, y: 20, width: 35, height: 60 }
    ]
  },
  {
    id: 'single-center',
    name: 'Одно фото по центру',
    maxPhotos: 1,
    photoZones: [
      { x: 37.5, y: 25, width: 25, height: 50 }
    ]
  },
  
  // Два фото на разворот
  {
    id: 'two-pages',
    name: 'По одному на страницу',
    maxPhotos: 2,
    photoZones: [
      { x: 10, y: 20, width: 30, height: 60 }, // левая страница
      { x: 60, y: 20, width: 30, height: 60 }  // правая страница
    ]
  },
  {
    id: 'two-left',
    name: 'Два на левой',
    maxPhotos: 2,
    photoZones: [
      { x: 5, y: 10, width: 35, height: 35 },
      { x: 5, y: 55, width: 35, height: 35 }
    ]
  },
  {
    id: 'two-right',
    name: 'Два на правой',
    maxPhotos: 2,
    photoZones: [
      { x: 60, y: 10, width: 35, height: 35 },
      { x: 60, y: 55, width: 35, height: 35 }
    ]
  },
  
  // Три фото
  {
    id: 'three-mixed',
    name: 'Смешанное размещение',
    maxPhotos: 3,
    photoZones: [
      { x: 5, y: 15, width: 35, height: 45 },   // левая страница большое
      { x: 55, y: 10, width: 20, height: 35 },  // правая страница маленькое
      { x: 78, y: 10, width: 20, height: 35 }   // правая страница маленькое
    ]
  },
  {
    id: 'three-pyramid',
    name: 'Пирамида',
    maxPhotos: 3,
    photoZones: [
      { x: 35, y: 5, width: 30, height: 30 },   // верх
      { x: 15, y: 45, width: 25, height: 40 },  // низ лево
      { x: 60, y: 45, width: 25, height: 40 }   // низ право
    ]
  },
  
  // Четыре фото
  {
    id: 'four-balanced',
    name: 'Сбалансированно по страницам',
    maxPhotos: 4,
    photoZones: [
      { x: 5, y: 10, width: 35, height: 35 },   // левая верх
      { x: 5, y: 55, width: 35, height: 35 },   // левая низ
      { x: 60, y: 10, width: 35, height: 35 },  // правая верх
      { x: 60, y: 55, width: 35, height: 35 }   // правая низ
    ]
  },
  {
    id: 'four-center-cross',
    name: 'Крест по центру',
    maxPhotos: 4,
    photoZones: [
      { x: 20, y: 5, width: 25, height: 35 },   // верх лево
      { x: 55, y: 5, width: 25, height: 35 },   // верх право
      { x: 20, y: 60, width: 25, height: 35 },  // низ лево
      { x: 55, y: 60, width: 25, height: 35 }   // низ право
    ]
  },
  
  // Пять фото
  {
    id: 'five-asymmetric',
    name: 'Асимметричный коллаж',
    maxPhotos: 5,
    photoZones: [
      { x: 5, y: 5, width: 35, height: 40 },    // левая большое
      { x: 5, y: 50, width: 17, height: 25 },   // левая маленькое
      { x: 25, y: 50, width: 17, height: 25 },  // левая маленькое
      { x: 55, y: 10, width: 40, height: 30 },  // правая большое
      { x: 65, y: 45, width: 30, height: 40 }   // правая среднее
    ]
  },
  
  // Шесть фото
  {
    id: 'six-mosaic',
    name: 'Мозаика',
    maxPhotos: 6,
    photoZones: [
      { x: 5, y: 10, width: 17, height: 25 },
      { x: 25, y: 10, width: 17, height: 25 },
      { x: 5, y: 40, width: 17, height: 25 },
      { x: 25, y: 40, width: 17, height: 25 },
      { x: 5, y: 70, width: 17, height: 25 },
      { x: 25, y: 70, width: 17, height: 25 }
    ]
  }
];

// Извлечение даты съемки из EXIF данных
async function getPhotoMetadata(file: File): Promise<PhotoWithMetadata> {
  const photo: PhotoWithMetadata = {
    file,
    url: URL.createObjectURL(file)
  };

  try {
    // Динамический импорт exifr для работы с EXIF данными
    const exifr = await import('exifr');
    
    // Извлекаем EXIF данные
    const exifData = await exifr.parse(file, {
      pick: ['DateTimeOriginal', 'DateTime', 'CreateDate', 'ModifyDate'],
      tiff: true,
      exif: true
    });

    // Используем различные поля даты в порядке предпочтения
    const dateFields = [
      exifData?.DateTimeOriginal,
      exifData?.DateTime,
      exifData?.CreateDate,
      exifData?.ModifyDate
    ];

    for (const dateField of dateFields) {
      if (dateField && dateField instanceof Date) {
        photo.dateTaken = dateField;
        break;
      } else if (dateField && typeof dateField === 'string') {
        const parsedDate = new Date(dateField);
        if (!isNaN(parsedDate.getTime())) {
          photo.dateTaken = parsedDate;
          break;
        }
      }
    }

    // Если не удалось извлечь дату из EXIF, используем дату модификации файла
    if (!photo.dateTaken) {
      photo.dateTaken = new Date(file.lastModified);
    }

    // Получаем размеры изображения
    if (file.type.startsWith('image/')) {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = () => {
          photo.dimensions = {
            width: img.width,
            height: img.height
          };
          resolve(void 0);
        };
        img.onerror = reject;
        img.src = photo.url;
      });
    }

  } catch (error) {
    console.warn('Не удалось извлечь EXIF данные:', error);
    // Fallback: используем дату модификации файла
    photo.dateTaken = new Date(file.lastModified);
  }

  return photo;
}

// Сортировка фотографий по дате съемки
async function sortPhotosByDate(files: File[]): Promise<PhotoWithMetadata[]> {
  const photosWithMetadata = await Promise.all(
    files.map(file => getPhotoMetadata(file))
  );
  
  return photosWithMetadata.sort((a, b) => {
    const dateA = a.dateTaken || new Date(0);
    const dateB = b.dateTaken || new Date(0);
    return dateA.getTime() - dateB.getTime();
  });
}

// Выбор шаблона коллажа на основе количества фотографий
function selectCollageTemplate(photoCount: number, spreadIndex: number = 0): CollageTemplate {
  const availableTemplates = COLLAGE_TEMPLATES.filter(
    template => template.maxPhotos >= photoCount
  );
  
  if (availableTemplates.length === 0) {
    // Если фотографий больше чем в любом шаблоне, используем самый большой
    return COLLAGE_TEMPLATES[COLLAGE_TEMPLATES.length - 1];
  }
  
  // Добавляем разнообразие в выбор шаблонов
  // Используем индекс разворота для создания предсказуемого, но разнообразного выбора
  const templateIndex = (spreadIndex + photoCount) % availableTemplates.length;
  return availableTemplates[templateIndex];
}

// Добавление небольшого случайного поворота для естественности
function addRandomRotation(): number {
  // Случайный поворот от -3 до +3 градусов
  return (Math.random() - 0.5) * 6;
}

export function generateSpreadId(): string {
  return `spread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generatePageId(): string {
  return `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateElementId(): string {
  return `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createEmptyPage(pageNumber: number, side: 'left' | 'right'): PhotobookPage {
  return {
    id: generatePageId(),
    pageNumber,
    side,
    elements: [],
    background: {
      type: 'color',
      value: '#ffffff'
    }
  };
}

export function createEmptySpread(spreadNumber: number): PhotobookSpread {
  return {
    id: generateSpreadId(),
    spreadNumber,
    leftPage: createEmptyPage(spreadNumber * 2 - 1, 'left'),
    rightPage: createEmptyPage(spreadNumber * 2, 'right')
  };
}

export function createNewProject(
  title: string = 'Новая фотокнига',
  size: PhotobookSize = DEFAULT_PHOTOBOOK_SIZE,
  totalPages: number = MIN_PAGES
): PhotobookProject {
  const spreadCount = totalPages / 2;
  const spreads: PhotobookSpread[] = [];

  for (let i = 1; i <= spreadCount; i++) {
    spreads.push(createEmptySpread(i));
  }

  return {
    id: `project_${Date.now()}`,
    title,
    size,
    spreads,
    totalPages,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'draft'
  };
}

export async function autoLayoutPhotos(
  photos: File[], 
  spreads: PhotobookSpread[],
  size: PhotobookSize
): Promise<PhotobookSpread[]> {
  // Сортируем фотографии по дате съемки
  const sortedPhotos = await sortPhotosByDate(photos);
  
  const updatedSpreads = [...spreads];
  let photoIndex = 0;

  // Улучшенный алгоритм автоматической раскладки с коллажами
  for (let i = 0; i < updatedSpreads.length && photoIndex < sortedPhotos.length; i++) {
    const spread = updatedSpreads[i];
    
    // Очищаем существующие элементы
    spread.leftPage.elements = [];
    spread.rightPage.elements = [];
    
    // Определяем количество фото на развороте (1-6 фото)
    const remainingPhotos = sortedPhotos.length - photoIndex;
    const maxPhotosOnSpread = Math.min(remainingPhotos, 6);
    const photosOnSpread = Math.min(
      Math.floor(Math.random() * maxPhotosOnSpread) + 1,
      remainingPhotos
    );

    const spreadPhotos = sortedPhotos.slice(photoIndex, photoIndex + photosOnSpread);
    
    // Выбираем шаблон коллажа
    const template = selectCollageTemplate(photosOnSpread, i);
    
    // Размещаем фото на развороте используя шаблон
    spreadPhotos.forEach((photo, index) => {
      if (index >= template.photoZones.length) return;
      
      const zone = template.photoZones[index];
      
      // Определяем, на какую страницу поместить фото
      // Левая страница: x < 50, правая страница: x >= 50
      const isLeftPage = zone.x < 50;
      const page = isLeftPage ? spread.leftPage : spread.rightPage;
      
      // Корректируем позицию для страницы
      const pageX = isLeftPage ? zone.x * 2 : (zone.x - 50) * 2;
      
      const photoElement: PhotoElement = {
        id: generateElementId(),
        type: 'photo',
        position: {
          x: Math.max(0, Math.min(100, pageX)),
          y: zone.y
        },
        size: {
          width: Math.min(80, zone.width * 2), // Ограничиваем размер для страницы
          height: zone.height
        },
        rotation: addRandomRotation(), // Добавляем небольшой случайный поворот
        opacity: 1,
        file: photo.file,
        photoUrl: photo.url
      };

      page.elements.push(photoElement);
    });

    photoIndex += photosOnSpread;
  }

  return updatedSpreads;
}

export async function generateQuickPreview(photos: File[]): Promise<QuickPreviewState> {
  const previewProject = createNewProject('Быстрый просмотр', DEFAULT_PHOTOBOOK_SIZE, 20);
  const previewSpreads = await autoLayoutPhotos(photos, previewProject.spreads, DEFAULT_PHOTOBOOK_SIZE);

  return {
    photos,
    previewSpreads,
    isGenerating: false,
    showPreview: true
  };
}

export function calculatePrice(
  size: PhotobookSize, 
  totalPages: number, 
  quantity: number = 1
): { basePrice: number; additionalPagesPrice: number; totalPrice: number } {
  const additionalPages = Math.max(0, totalPages - MIN_PAGES);
  const basePrice = size.basePrice;
  const additionalPagesPrice = additionalPages * size.additionalPagePrice;
  const subtotal = basePrice + additionalPagesPrice;
  const totalPrice = subtotal * quantity;

  return {
    basePrice,
    additionalPagesPrice,
    totalPrice
  };
}

export function exportProjectToJSON(project: PhotobookProject): string {
  return JSON.stringify(project, null, 2);
}

export function importProjectFromJSON(jsonString: string): PhotobookProject {
  const data = JSON.parse(jsonString);
  
  // Восстанавливаем даты
  data.createdAt = new Date(data.createdAt);
  data.updatedAt = new Date(data.updatedAt);
  
  return data as PhotobookProject;
}

export function validateProject(project: PhotobookProject): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!project.title || project.title.trim().length === 0) {
    errors.push('Название проекта не может быть пустым');
  }

  if (project.totalPages < MIN_PAGES) {
    errors.push(`Минимальное количество страниц: ${MIN_PAGES}`);
  }

  if (project.totalPages % 2 !== 0) {
    errors.push('Количество страниц должно быть четным');
  }

  if (project.spreads.length !== project.totalPages / 2) {
    errors.push('Количество разворотов не соответствует количеству страниц');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}