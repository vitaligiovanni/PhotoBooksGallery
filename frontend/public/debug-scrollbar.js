// Диагностика появления scrollbar и layout shifts
(function() {
  const logs = [];
  const startTime = performance.now();
  
  function log(message, data = {}) {
    const time = (performance.now() - startTime).toFixed(2);
    const entry = `[${time}ms] ${message}`;
    logs.push(entry);
    console.log(`%c${entry}`, 'color: #ff6b6b; font-weight: bold;', data);
  }
  
  function getScrollbarInfo() {
    const html = document.documentElement;
    const body = document.body;
    
    return {
      htmlOverflowY: html ? getComputedStyle(html).overflowY : 'N/A',
      bodyOverflowY: body ? getComputedStyle(body).overflowY : 'N/A',
      rootOverflowY: document.getElementById('root') ? getComputedStyle(document.getElementById('root')).overflowY : 'N/A',
      windowInnerWidth: window.innerWidth,
      documentClientWidth: html ? html.clientWidth : 0,
      scrollbarWidth: window.innerWidth - (html ? html.clientWidth : window.innerWidth),
      hasVerticalScrollbar: html ? html.scrollHeight > html.clientHeight : false,
      scrollHeight: html ? html.scrollHeight : 0,
      clientHeight: html ? html.clientHeight : 0,
      bodyExists: !!body,
      htmlExists: !!html
    };
  }
  
  log('🔍 Script loaded', getScrollbarInfo());
  
  // Проверяем до DOMContentLoaded
  if (document.readyState === 'loading') {
    log('⏳ Document still loading');
    document.addEventListener('DOMContentLoaded', function() {
      log('📄 DOMContentLoaded', getScrollbarInfo());
    });
  } else {
    log('✅ Document already loaded');
  }
  
  // Отслеживаем изменения стилей
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        log(`🎨 Style changed on ${mutation.target.tagName}`, {
          target: mutation.target,
          style: mutation.target.getAttribute('style')
        });
      }
      
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target;
        if (target === document.documentElement || target === document.body) {
          log(`🏷️ Class changed on ${target.tagName}`, {
            classes: target.className,
            info: getScrollbarInfo()
          });
        }
      }
    });
  });
  
  // Наблюдаем за html, body и #root
  observer.observe(document.documentElement, { attributes: true, attributeOldValue: true });
  observer.observe(document.body, { attributes: true, attributeOldValue: true });
  
  // Когда #root появится, наблюдаем и за ним
  const checkRoot = setInterval(function() {
    const root = document.getElementById('root');
    if (root) {
      clearInterval(checkRoot);
      log('📦 #root found', getScrollbarInfo());
      observer.observe(root, { attributes: true, attributeOldValue: true });
    }
  }, 10);
  
  // Отслеживаем загрузку CSS
  let cssLoaded = false;
  const checkCSS = setInterval(function() {
    const computed = getComputedStyle(document.documentElement);
    if (computed.overflowY === 'scroll' && !cssLoaded) {
      cssLoaded = true;
      clearInterval(checkCSS);
      log('🎨 CSS LOADED! overflow-y: scroll applied', getScrollbarInfo());
    }
  }, 10);
  
  // Отслеживаем изменения размеров
  let lastWidth = window.innerWidth;
  let lastClientWidth = document.documentElement.clientWidth;
  
  const checkResize = setInterval(function() {
    const currentWidth = window.innerWidth;
    const currentClientWidth = document.documentElement.clientWidth;
    const scrollbarWidth = currentWidth - currentClientWidth;
    
    if (currentWidth !== lastWidth || currentClientWidth !== lastClientWidth) {
      log('📐 LAYOUT SHIFT DETECTED!', {
        from: { width: lastWidth, client: lastClientWidth },
        to: { width: currentWidth, client: currentClientWidth },
        scrollbarAppeared: scrollbarWidth > lastWidth - lastClientWidth,
        scrollbarWidth: scrollbarWidth,
        info: getScrollbarInfo()
      });
      lastWidth = currentWidth;
      lastClientWidth = currentClientWidth;
    }
  }, 16); // ~60fps
  
  // Останавливаем через 5 секунд
  setTimeout(function() {
    clearInterval(checkCSS);
    clearInterval(checkResize);
    clearInterval(checkRoot);
    observer.disconnect();
    log('⏹️ Monitoring stopped');
    console.log('%c📊 FULL LOG:', 'color: #4ecdc4; font-size: 14px; font-weight: bold;');
    console.log(logs.join('\n'));
  }, 5000);
  
  // Экспортируем для ручного вызова
  window.debugScrollbar = {
    getInfo: getScrollbarInfo,
    getLogs: () => logs
  };
  
  log('✅ Monitoring started for 5 seconds');
})();
