// Визуальный индикатор layout shift
(function() {
  let shiftDetected = false;
  
  // Создаём индикатор
  const indicator = document.createElement('div');
  indicator.id = 'shift-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(255, 0, 0, 0.9);
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    font-family: monospace;
    font-size: 14px;
    font-weight: bold;
    z-index: 999999;
    display: none;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    animation: pulse 1s infinite;
  `;
  indicator.textContent = '⚠️ LAYOUT SHIFT DETECTED!';
  
  // Добавляем анимацию
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.05); }
    }
  `;
  document.head.appendChild(style);
  
  // Ждём загрузки body
  function init() {
    if (!document.body) {
      setTimeout(init, 10);
      return;
    }
    document.body.appendChild(indicator);
  }
  init();
  
  // Отслеживаем изменения ширины
  let lastClientWidth = document.documentElement.clientWidth;
  let checkCount = 0;
  const maxChecks = 500; // 5 секунд при 10ms интервале
  
  const interval = setInterval(() => {
    checkCount++;
    const currentClientWidth = document.documentElement.clientWidth;
    
    if (currentClientWidth !== lastClientWidth && !shiftDetected) {
      shiftDetected = true;
      const shift = Math.abs(currentClientWidth - lastClientWidth);
      
      console.error('%c🚨 LAYOUT SHIFT!', 'color: red; font-size: 20px; font-weight: bold;', {
        time: performance.now().toFixed(2) + 'ms',
        oldWidth: lastClientWidth,
        newWidth: currentClientWidth,
        shift: shift + 'px',
        likely: shift > 10 ? 'SCROLLBAR APPEARED' : 'Unknown cause',
        stack: new Error().stack
      });
      
      indicator.style.display = 'block';
      indicator.textContent = `⚠️ SHIFT: ${shift}px at ${performance.now().toFixed(0)}ms`;
      
      // Скрываем через 3 секунды
      setTimeout(() => {
        indicator.style.display = 'none';
      }, 3000);
    }
    
    lastClientWidth = currentClientWidth;
    
    // Останавливаем через 5 секунд
    if (checkCount >= maxChecks) {
      clearInterval(interval);
      if (!shiftDetected) {
        console.log('%c✅ NO LAYOUT SHIFT DETECTED', 'color: green; font-size: 16px; font-weight: bold;');
      }
    }
  }, 10);
  
  window.debugLayoutShift = {
    reset: () => {
      shiftDetected = false;
      indicator.style.display = 'none';
    }
  };
})();
