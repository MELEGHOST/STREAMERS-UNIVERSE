const { execSync } = require('child_process');

try {
  await checkDependencies(); // Проверяем зависимости
} catch (error) {
  console.error('Ошибка в процессе постустановки:', error);
  // console.log('Продолжаем сборку несмотря на ошибки...'); 
  // Решаем, нужно ли прерывать сборку или продолжать
  // process.exit(1); // Прерываем сборку, если критично
} 