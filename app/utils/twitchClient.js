import { ApiClient } from '@twurple/api';
import { AppTokenAuthProvider } from '@twurple/auth';

const clientId = process.env.TWITCH_CLIENT_ID;
const clientSecret = process.env.TWITCH_CLIENT_SECRET;

if (!clientId || !clientSecret) {
    console.error("[Utils/twitchClient] Critical Error: Twitch Client ID or Secret is missing!");
    // Бросать ошибку здесь может быть рискованно, 
    // лучше обработать null в месте вызова getTwitchClient
}

// Кэш для клиента и токена
let apiClient = null;
let appTokenProvider = null;

/**
 * Получает или инициализирует ApiClient для работы с Twitch API,
 * используя аутентификацию по токену приложения.
 * @returns {Promise<ApiClient|null>} Проинициализированный ApiClient или null в случае ошибки.
 */
export async function getTwitchClient() {
    if (!clientId || !clientSecret) {
        console.error("[getTwitchClient] Невозможно инициализировать клиент: отсутствуют TWITCH_CLIENT_ID или TWITCH_CLIENT_SECRET.");
        return null;
    }

    // Если клиент уже инициализирован, возвращаем его
    // В бессерверной среде это может не работать так, как ожидается,
    // но для Vercel часто сохраняется контекст между вызовами в пределах одного инстанса.
    if (apiClient) {
        // console.log('[getTwitchClient] Возвращаем закэшированный ApiClient.');
        return apiClient;
    }

    console.log('[getTwitchClient] Инициализация нового Twitch ApiClient...');
    try {
        // Создаем провайдер аутентификации по токену приложения
        appTokenProvider = new AppTokenAuthProvider(clientId, clientSecret);
        
        // Можно опционально запросить токен заранее, чтобы убедиться в валидности кредов
        // await appTokenProvider.getAccessToken(); 
        // console.log('[getTwitchClient] Токен приложения успешно получен/проверен.');

        // Создаем клиент API
        apiClient = new ApiClient({ authProvider: appTokenProvider });
        console.log('[getTwitchClient] Новый Twitch ApiClient успешно инициализирован.');
        return apiClient;
    } catch (error) {
        console.error('[getTwitchClient] Ошибка при инициализации Twitch ApiClient:', error);
        apiClient = null; // Сбрасываем кэш при ошибке
        return null; // Возвращаем null при ошибке инициализации
    }
} 