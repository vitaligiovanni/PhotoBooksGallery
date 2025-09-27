import { useState, useEffect } from "react";
import { WelcomePopup } from "./WelcomePopup";
import { ExitIntentPopup } from "./ExitIntentPopup";
import type { Popup } from "@shared/schema";

interface PopupManagerProps {
  popups: Popup[];
}

export function PopupManager({ popups }: PopupManagerProps) {
  const [activePopup, setActivePopup] = useState<Popup | null>(null);
  const [shownPopups, setShownPopups] = useState<Set<string>>(new Set());
  const [pageLoadTime] = useState(Date.now());
  const [mouseY, setMouseY] = useState(0);
  const [hasExitIntent, setHasExitIntent] = useState(false);

  // Загружаем информацию о показанных попапах из localStorage
  useEffect(() => {
    const stored = localStorage.getItem('shownPopups');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setShownPopups(new Set(parsed));
      } catch (e) {
        console.error('Error parsing shownPopups from localStorage:', e);
      }
    }
  }, []);

  // Сохраняем информацию о показанных попапах в localStorage
  const markPopupAsShown = (popupId: string) => {
    const newShown = new Set(shownPopups);
    newShown.add(popupId);
    setShownPopups(newShown);
    localStorage.setItem('shownPopups', JSON.stringify(Array.from(newShown)));
  };

  // Обработчик движения мыши для exit intent
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseY(e.clientY);

      // Проверяем exit intent (мышь движется вверх)
      if (e.clientY <= 50 && !hasExitIntent) {
        setHasExitIntent(true);
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 || (e.clientY < 50 && (e.clientX < 50 || e.clientX > window.innerWidth - 50))) {
        setHasExitIntent(true);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [hasExitIntent]);

  // Логика выбора и показа попапов
  useEffect(() => {
    if (popups.length === 0 || activePopup) return;

    const now = Date.now();
    const timeOnPage = now - pageLoadTime;

    // Фильтруем активные попапы, которые еще не были показаны
    const availablePopups = popups.filter(popup =>
      popup.isActive &&
      popup.status === 'active' &&
      !shownPopups.has(popup.id) &&
      (!popup.maxImpressions || (popup.currentImpressions || 0) < popup.maxImpressions)
    );

    if (availablePopups.length === 0) return;

    // Проверяем условия показа для каждого попапа
    for (const popup of availablePopups) {
      let shouldShow = false;

      // Проверяем временные ограничения
      if (popup.startDate && new Date(popup.startDate) > new Date()) continue;
      if (popup.endDate && new Date(popup.endDate) < new Date()) continue;

      // Проверяем таргетинг по страницам
      if (popup.targetPages && popup.targetPages.length > 0) {
        const currentPath = window.location.pathname;
        const isTargetPage = popup.targetPages.some(page => {
          if (page === '/') return currentPath === '/';
          return currentPath.startsWith(page);
        });
        if (!isTargetPage) continue;
      }

      // Проверяем условия показа
      switch (popup.type) {
        case 'welcome':
          // Welcome popup - показываем через указанное время после загрузки страницы
          if (popup.showDelay && timeOnPage > popup.showDelay * 1000) {
            shouldShow = true;
          }
          break;

        case 'exit_intent':
          // Exit intent popup - показываем при попытке ухода
          if (hasExitIntent && timeOnPage > 10000) {
            shouldShow = true;
          }
          break;

        case 'newsletter':
          // Newsletter popup - показываем через 15 секунд
          if (timeOnPage > 15000) {
            shouldShow = true;
          }
          break;

        case 'special_offer':
          // Special offer popup - показываем через 20 секунд
          if (timeOnPage > 20000) {
            shouldShow = true;
          }
          break;

        case 'cart_abandonment':
          // Cart abandonment popup - показываем через 30 секунд
          if (timeOnPage > 30000) {
            shouldShow = true;
          }
          break;
      }

      if (shouldShow) {
        setActivePopup(popup);
        markPopupAsShown(popup.id);
        break; // Показываем только один попап за раз
      }
    }
  }, [popups, activePopup, shownPopups, pageLoadTime, hasExitIntent, mouseY]);

  const handleClosePopup = () => {
    setActivePopup(null);
  };

  if (!activePopup) return null;

  const getLocalizedText = (field: any, lang: string = 'ru') => {
    if (typeof field === 'string') return field;
    if (field && typeof field === 'object') return field[lang] || field.ru || '';
    return '';
  };

  const popupProps = {
    isOpen: true,
    onClose: handleClosePopup,
    title: getLocalizedText(activePopup.title),
    content: getLocalizedText(activePopup.content),
    buttonText: getLocalizedText(activePopup.buttonText),
    buttonLink: activePopup.buttonLink || '/',
    imageUrl: activePopup.imageUrl || undefined,
    backgroundColor: activePopup.backgroundColor || '#ffffff',
    textColor: activePopup.textColor || '#000000',
  };

  if (activePopup.type === 'exit_intent') {
    return <ExitIntentPopup {...popupProps} />;
  }

  return <WelcomePopup {...popupProps} />;
}