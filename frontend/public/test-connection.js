// Простой тест API соединения
async function testConnection() {
    console.log('🔍 Тестируем соединение с API...');
    
    try {
        // Тест прямого обращения к backend
        console.log('📡 Тестируем прямое обращение к backend (localhost:5002)...');
        const directResponse = await fetch('http://localhost:5002/api/categories');
        console.log('Direct response status:', directResponse.status);
        if (directResponse.ok) {
            const data = await directResponse.json();
            console.log('✅ Прямое обращение успешно, категорий:', data.length);
        }
        
        // Тест через proxy (localhost:3000/api)
        console.log('🔄 Тестируем через Vite proxy (/api)...');
        const proxyResponse = await fetch('/api/categories');
        console.log('Proxy response status:', proxyResponse.status);
        if (proxyResponse.ok) {
            const data = await proxyResponse.json();
            console.log('✅ Proxy работает, категорий:', data.length);
            
            // Тестируем проблемную категорию
            if (data.length > 0) {
                const testCat = data.find(c => c.id === 'dd2bb2d8-c785-40ce-8ac6-45339d51eb26') || data[0];
                console.log('🎯 Тестируем категорию:', testCat.id);
                
                // Диагностика
                const diagResponse = await fetch(`/api/categories/${testCat.id}/diagnose`);
                console.log('Диагностика статус:', diagResponse.status);
                if (diagResponse.ok) {
                    const diag = await diagResponse.json();
                    console.log('📊 Диагностика:', diag);
                }
                
                // НЕ УДАЛЯЕМ, только проверяем endpoint
                console.log('❗ Проверяем endpoint удаления (без выполнения)...');
                // const deleteResponse = await fetch(`/api/categories/${testCat.id}/force?mode=uncategorized`, {
                //     method: 'DELETE'
                // });
                // console.log('Delete response status:', deleteResponse.status);
            }
        } else {
            console.error('❌ Proxy не работает:', proxyResponse.statusText);
        }
        
    } catch (error) {
        console.error('💥 Ошибка тестирования:', error);
    }
}

// Запускаем тест когда страница загружена
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testConnection);
} else {
    testConnection();
}