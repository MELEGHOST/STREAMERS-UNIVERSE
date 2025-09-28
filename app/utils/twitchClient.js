import { ApiClient } from '@twurple/api';
import { AppTokenAuthProvider, StaticAuthProvider } from '@twurple/auth';
import { verifyJwt } from './jwt';

const clientId = process.env.TWITCH_CLIENT_ID;
const clientSecret = process.env.TWITCH_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    '[Utils/twitchClient] Critical Error: Twitch Client ID or Secret is missing!'
  );
  // Бросать ошибку здесь может быть рискованно,
  // лучше обработать null в месте вызова getTwitchClient
}

// Кэш для клиента и токена
let appApiClient = null;
let appTokenProvider = null;

/**
 * Получает или инициализирует ApiClient для работы с Twitch API,
 * используя аутентификацию по токену приложения.
 * @returns {Promise<ApiClient|null>} Проинициализированный ApiClient или null в случае ошибки.
 */
export async function getTwitchClient() {
  if (!clientId || !clientSecret) {
    console.error(
      '[getTwitchClient] Невозможно инициализировать клиент: отсутствуют TWITCH_CLIENT_ID или TWITCH_CLIENT_SECRET.'
    );
    return null;
  }

  // Если клиент уже инициализирован, возвращаем его
  // В бессерверной среде это может не работать так, как ожидается,
  // но для Vercel часто сохраняется контекст между вызовами в пределах одного инстанса.
  if (appApiClient) {
    // console.log('[getTwitchClient] Возвращаем закэшированный ApiClient.');
    return appApiClient;
  }

  console.log(
    '[getTwitchClient] Инициализация нового Twitch ApiClient (App Token)...'
  );
  try {
    // Создаем провайдер аутентификации по токену приложения
    appTokenProvider = new AppTokenAuthProvider(clientId, clientSecret);

    // Можно опционально запросить токен заранее, чтобы убедиться в валидности кредов
    // await appTokenProvider.getAccessToken();
    // console.log('[getTwitchClient] Токен приложения успешно получен/проверен.');

    // Создаем клиент API
    appApiClient = new ApiClient({ authProvider: appTokenProvider });
    console.log(
      '[getTwitchClient] Новый Twitch ApiClient (App Token) успешно инициализирован.'
    );
    return appApiClient;
  } catch (error) {
    console.error(
      '[getTwitchClient] Ошибка при инициализации Twitch ApiClient (App Token):',
      error
    );
    appApiClient = null; // Сбрасываем кэш при ошибке
    return null; // Возвращаем null при ошибке инициализации
  }
}

// --- Клиент с User Token (переданным через JWT) ---
/**
 * Получает ApiClient для работы с Twitch API,
 * используя аутентификацию по токену ДОСТУПА пользователя Twitch,
 * который извлекается из JWT.
 * @param {string} jwtToken - JWT токен текущего пользователя Supabase.
 * @returns {Promise<ApiClient|null>} Проинициализированный ApiClient или null в случае ошибки или отсутствия токена Twitch.
 */
export async function getTwitchClientWithToken(jwtToken) {
  if (!clientId) {
    console.error(
      '[getTwitchClientWithToken] Невозможно инициализировать клиент: отсутствует TWITCH_CLIENT_ID.'
    );
    return null;
  }
  if (!jwtToken) {
    console.error('[getTwitchClientWithToken] Не передан JWT токен.');
    return null;
  }

  try {
    // 1. Верифицируем JWT и извлекаем токен Twitch
    const verifiedToken = await verifyJwt(jwtToken);
    if (!verifiedToken) {
      console.error('[getTwitchClientWithToken] Невалидный JWT токен.');
      return null;
    }

    // Ищем токен доступа Twitch внутри данных пользователя
    const twitchAccessToken =
      verifiedToken.user_metadata?.provider_token ||
      verifiedToken.provider_token;

    if (!twitchAccessToken) {
      console.error(
        '[getTwitchClientWithToken] Токен доступа Twitch не найден в JWT.'
      );
      return null;
    }

    // 2. Создаем StaticAuthProvider с токеном пользователя Twitch
    // Мы не знаем refresh token и expiry, поэтому используем Static
    const authProvider = new StaticAuthProvider(clientId, twitchAccessToken); // Требуется clientId!

    // 3. Создаем клиент API с этим провайдером
    const userApiClient = new ApiClient({ authProvider });
    console.log(
      '[getTwitchClientWithToken] Twitch ApiClient (User Token) успешно инициализирован.'
    );
    return userApiClient;
  } catch (error) {
    console.error(
      '[getTwitchClientWithToken] Ошибка при инициализации Twitch ApiClient (User Token):',
      error
    );
    return null;
  }
}

// --- Добавляем утилиты для поиска ---

/**
 * Ищет каналы на Twitch по запросу.
 * @param {string} query - Поисковый запрос.
 * @param {number} limit - Максимальное количество результатов.
 * @returns {Promise<Array>} Массив объектов каналов.
 */
export async function searchTwitchChannels(query, limit = 10) {
  try {
    const apiClient = await getTwitchClient();
    if (!apiClient)
      throw new Error('Не удалось инициализировать Twitch клиент.');

    console.log(`[TwitchUtils] Searching channels for query: "${query}"`);
    const response = await apiClient.search.searchChannels(query, { limit });
    console.log(`[TwitchUtils] Found ${response.data.length} channels.`);
    // Возвращаем нужные поля
    return response.data.map((channel) => ({
      id: channel.id,
      broadcaster_login: channel.name,
      display_name: channel.displayName,
      thumbnail_url: channel.thumbnailUrl,
      is_live: channel.isLive,
      title: channel.title,
      // Можно добавить еще поля, если нужно
    }));
  } catch (error) {
    console.error(
      `[TwitchUtils] Ошибка при поиске каналов Twitch для "${query}":`,
      error
    );
    throw error; // Пробрасываем ошибку дальше
  }
}

/**
 * Получает данные пользователей Twitch по их логинам.
 * @param {Array<string>} logins - Массив логинов.
 * @returns {Promise<Array>} Массив объектов пользователей.
 */
export async function getTwitchUsers(logins) {
  if (!logins || logins.length === 0) return [];
  try {
    const apiClient = await getTwitchClient();
    if (!apiClient)
      throw new Error('Не удалось инициализировать Twitch клиент.');

    console.log(`[TwitchUtils] Getting users by login: ${logins.join(', ')}`);
    const users = await apiClient.users.getUsersByNames(logins);
    console.log(`[TwitchUtils] Got data for ${users.length} users.`);
    // Возвращаем нужные поля
    return users.map((user) => ({
      id: user.id,
      login: user.name,
      display_name: user.displayName,
      profile_image_url: user.profilePictureUrl,
      // Можно добавить еще поля
    }));
  } catch (error) {
    console.error(
      `[TwitchUtils] Ошибка при получении пользователей Twitch по логинам (${logins.join(', ')}):`,
      error
    );
    throw error;
  }
}
