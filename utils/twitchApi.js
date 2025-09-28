// Удален лишний импорт 'log' из console

// Кеш для токена Twitch (простой вариант в памяти)
let twitchAppAccessToken = null;
let tokenExpirationTime = 0;

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

/**
 * Получает или обновляет токен доступа приложения Twitch.
 * @returns {Promise<string>} Токен доступа.
 * @throws {Error} Если не удалось получить токен.
 */
export async function getTwitchAppAccessToken() {
  const now = Date.now();

  // Проверяем кеш и срок годности (с запасом в 60 секунд)
  if (twitchAppAccessToken && tokenExpirationTime > now + 60000) {
    // console.log('[TwitchAPI] Using cached App Access Token.');
    return twitchAppAccessToken;
  }

  console.log('[TwitchAPI] Requesting new App Access Token...');
  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    console.error(
      '[TwitchAPI] Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET'
    );
    throw new Error('Twitch API credentials are not configured.');
  }

  try {
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: TWITCH_CLIENT_ID,
        client_secret: TWITCH_CLIENT_SECRET,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(
        `[TwitchAPI] Failed to get token: ${response.status}`,
        errorData
      );
      throw new Error(
        `Failed to get Twitch App Access Token: ${response.status}`
      );
    }

    const data = await response.json();
    if (!data.access_token || !data.expires_in) {
      console.error('[TwitchAPI] Invalid token response:', data);
      throw new Error('Invalid response from Twitch token endpoint.');
    }

    twitchAppAccessToken = data.access_token;
    // Устанавливаем время истечения (expires_in в секундах)
    tokenExpirationTime = now + data.expires_in * 1000;
    console.log('[TwitchAPI] New App Access Token obtained.');
    return twitchAppAccessToken;
  } catch (error) {
    console.error('[TwitchAPI] Error fetching Twitch App Access Token:', error);
    // Сбрасываем кеш при ошибке
    twitchAppAccessToken = null;
    tokenExpirationTime = 0;
    throw error; // Пробрасываем ошибку дальше
  }
}

/**
 * Выполняет запрос к Twitch Helix API.
 * @param {string} endpoint Путь к эндпоинту (например, 'search/channels').
 * @param {URLSearchParams} [queryParams] Параметры запроса.
 * @returns {Promise<object>} Данные от Twitch API.
 * @throws {Error} Если запрос не удался.
 */
async function fetchTwitchApi(endpoint, queryParams = null) {
  const token = await getTwitchAppAccessToken();
  const url = new URL(`https://api.twitch.tv/helix/${endpoint}`);
  if (queryParams) {
    url.search = queryParams.toString();
  }

  // console.log(`[TwitchAPI] Fetching: ${url.toString()}`);
  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // Попытка получить тело ошибки
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch {
        /* ignore */
      }
      console.error(
        `[TwitchAPI] API Error ${response.status} for ${endpoint}:`,
        errorBody
      );
      throw new Error(
        `Twitch API request failed for ${endpoint} with status ${response.status}`
      );
    }

    // Twitch иногда возвращает 204 No Content, например, если ничего не найдено
    if (response.status === 204) {
      return { data: [] }; // Возвращаем пустой массив данных
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`[TwitchAPI] Error during fetch to ${endpoint}:`, error);
    throw error; // Пробрасываем ошибку
  }
}

/**
 * Ищет каналы на Twitch по запросу.
 * @param {string} query Строка поиска.
 * @param {number} [limit=10] Максимальное количество результатов.
 * @returns {Promise<Array<object>>} Массив найденных каналов.
 */
export async function searchTwitchChannels(query, limit = 10) {
  if (!query) return [];
  console.log(`[TwitchAPI] Searching channels for query: "${query}"`);
  const params = new URLSearchParams({
    query: query,
    first: limit.toString(),
  });
  const result = await fetchTwitchApi('search/channels', params);
  console.log(`[TwitchAPI] Found ${result?.data?.length || 0} channels.`);
  return result?.data || []; // Возвращаем массив каналов или пустой массив
}

/**
 * Получает информацию о пользователях Twitch по их логинам.
 * @param {string|Array<string>} logins Логин или массив логинов.
 * @returns {Promise<Array<object>>} Массив данных пользователей.
 */
export async function getTwitchUsers(logins) {
  if (!logins || (Array.isArray(logins) && logins.length === 0)) {
    return [];
  }

  const loginArray = Array.isArray(logins) ? logins : [logins];
  console.log(`[TwitchAPI] Getting users by login: ${loginArray.join(', ')}`);

  // Twitch API позволяет запрашивать до 100 логинов за раз
  if (loginArray.length > 100) {
    console.warn('[TwitchAPI] Too many logins requested (>100), trimming.');
    loginArray.length = 100;
  }

  const params = new URLSearchParams();
  loginArray.forEach((login) => params.append('login', login.toLowerCase())); // Twitch API чувствителен к регистру логина? Обычно нет, но на всякий случай приводим к lower

  const result = await fetchTwitchApi('users', params);
  console.log(`[TwitchAPI] Got data for ${result?.data?.length || 0} users.`);
  return result?.data || []; // Возвращаем массив пользователей или пустой массив
}

/**
 * Проверяет существование пользователя Twitch по логину.
 * @param {string} login Логин пользователя.
 * @returns {Promise<object|null>} Данные пользователя, если найден, иначе null.
 */
export async function validateTwitchUser(login) {
  if (!login) return null;
  const users = await getTwitchUsers(login.toLowerCase());
  return users.length > 0 ? users[0] : null; // Возвращаем первого найденного или null
}
