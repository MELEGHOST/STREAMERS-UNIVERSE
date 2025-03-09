# Руководство по миграции на Next.js App Router

## Проблемы совместимости и их решения

### 1. Проблемы с localStorage

При миграции с Pages Router на App Router возникают проблемы с доступом к localStorage, так как компоненты теперь могут рендериться на сервере.

**Решение:** Используйте утилиту `clientStorage` для безопасной работы с localStorage:

```javascript
import clientStorage from '../app/utils/clientStorage';

// Получение данных
const userData = clientStorage.getItem('twitch_user');

// Сохранение данных
clientStorage.setItem('twitch_user', userData);

// Удаление данных
clientStorage.removeItem('twitch_user');
```

### 2. Устаревшие импорты

Компонент `Head` из 'next/head' устарел в App Router.

**Решение:** Используйте метаданные вместо компонента Head:

```javascript
// В файле layout.js или page.js
export const metadata = {
  title: 'Название страницы',
  description: 'Описание страницы',
  // Другие метаданные
};
```

### 3. Хуки, требующие Suspense boundary

Хуки `useSearchParams()`, `useParams()` и другие клиентские хуки требуют обертки в Suspense boundary.

**Решение:** Оборачивайте компоненты, использующие эти хуки, в Suspense:

```javascript
import { Suspense } from 'react';

// Компонент, использующий хуки
function ContentComponent() {
  const searchParams = useSearchParams();
  // ...
}

// Родительский компонент с Suspense
export default function PageComponent() {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <ContentComponent />
    </Suspense>
  );
}
```

## Шаги по миграции

1. **Замените прямые обращения к localStorage** на вызовы утилиты clientStorage
2. **Удалите импорты Head** и замените их на метаданные
3. **Оберните компоненты с хуками useSearchParams** в Suspense boundary
4. **Перенесите API-маршруты** из папки `pages/api` в папку `app/api` с использованием Route Handlers

## Полезные ссылки

- [Документация по App Router](https://nextjs.org/docs/app)
- [Метаданные в App Router](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Server Components и Client Components](https://nextjs.org/docs/app/building-your-application/rendering/client-components)
- [Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/router-handlers)

## Возможные ошибки и их решения

### Error: useSearchParams() should be wrapped in a suspense boundary

**Причина:** Хук useSearchParams используется без обертки в Suspense.

**Решение:** Оберните компонент, использующий useSearchParams, в Suspense boundary.

### ReferenceError: localStorage is not defined

**Причина:** Попытка доступа к localStorage при серверном рендеринге.

**Решение:** Используйте утилиту clientStorage вместо прямого обращения к localStorage.

### Warning: Failed prop type: The prop `head` is marked as required in `Component`, but its value is `undefined`

**Причина:** Использование устаревшего компонента Head в App Router.

**Решение:** Замените компонент Head на метаданные. 