import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./index.css";

// NOTE: Убрали динамическое принудительное управление overflow/minHeight,
// т.к. это могло вызывать мгновенный горизонтальный сдвиг (первый рендер без скроллбара
// затем JS дорисовывает +1px высоту -> появляется скроллбар -> сдвиг контента влево).
// CSS уже содержит html { overflow-y: scroll; scrollbar-gutter: stable both-edges; }
// чего достаточно для стабилизации ширины.

// Помечаем момент гидратации — можно использовать для отключения переходов до полной загрузки.
document.documentElement.classList.add('app-starting');

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

// После первого кадра помечаем как "hydrated"
requestAnimationFrame(() => {
  document.documentElement.classList.remove('app-starting');
  document.documentElement.classList.add('hydrated');
});
