import { PrismaClient } from '@prisma/client';

// Настройка PrismaClient с опциями логирования для разработки
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

// Используем глобальную переменную для сохранения экземпляра клиента
// в режиме разработки Next.js (это предотвращает создание множества соединений)
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

// Экспортируем экземпляр клиента - создаем новый или используем существующий
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// В режиме разработки сохраняем экземпляр клиента в глобальную переменную
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}