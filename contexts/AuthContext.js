'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import Cookies from 'js-cookie';
import { DataStorage } from '../app/utils/dataStorage';

// Создаем контекст авторизации
const AuthContext = createContext({
  isAuthenticated: false,
  userId: null,
  userLogin: null,
  userAvatar: null,
  login: () => {},
  logout: () => {},
});

// Провайдер контекста авторизации
export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userLogin, setUserLogin] = useState(null);
  const [userAvatar, setUserAvatar] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Пустая функция для совместимости (на клиенте JWT токены не создаются)
  const createAndSetJwtToken = useCallback(() => {
    // Не выполняем никаких действий, JWT токены создаются только на сервере
    console.log('[Vercel] createAndSetJwtToken: JWT токены можно создавать только на сервере');
  }, []);
  
  // Функция для входа пользователя
  const login = useCallback(async (userData, token) => {
    try {
      if (!userData || !token) {
        console.error('[Vercel] login: отсутствуют данные пользователя или токен');
        return false;
      }
      
      // На Vercel пропускаем прямую проверку токена через Twitch API
      console.log('[Vercel] login: сохраняем данные пользователя и токен');
      
      // Сохраняем токен в куки
      Cookies.set('twitch_access_token', token, { 
        expires: 7, 
        path: '/',
        secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
        sameSite: 'lax'
      });
      
      // Сохраняем данные пользователя в куки
      const userDataString = typeof userData === 'string' ? userData : JSON.stringify(userData);
      Cookies.set('twitch_user', userDataString, { 
        expires: 7, 
        path: '/',
        secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
        sameSite: 'lax'
      });
      
      // Сохраняем данные в localStorage для надежности
      localStorage.setItem('cookie_twitch_access_token', token);
      localStorage.setItem('cookie_twitch_user', userDataString);
      localStorage.setItem('twitch_user', userDataString);
      localStorage.setItem('is_authenticated', 'true');
      
      // Создаем JWT токен (пустая функция на клиенте)
      createAndSetJwtToken(userData);
      
      // Обновляем состояние
      setIsAuthenticated(true);
      setUserId(userData.id);
      setUserLogin(userData.login || userData.display_name);
      setUserAvatar(userData.profile_image_url);
      
      console.log('[Vercel] login: вход выполнен успешно для пользователя:', userData.id);
      return true;
    } catch (error) {
      console.error('[Vercel] login: ошибка при входе:', error);
      return false;
    }
  }, [createAndSetJwtToken]);
  
  // Функция для выхода пользователя
  const logout = useCallback(() => {
    try {
      // Удаляем куки
      Cookies.remove('auth_token', { path: '/' });
      Cookies.remove('twitch_access_token', { path: '/' });
      Cookies.remove('twitch_refresh_token', { path: '/' });
      Cookies.remove('twitch_user', { path: '/' });
      Cookies.remove('twitch_user_data', { path: '/' });
      Cookies.remove('twitch_state', { path: '/' });
      
      // Удаляем данные из localStorage
      localStorage.removeItem('cookie_twitch_access_token');
      localStorage.removeItem('cookie_twitch_refresh_token');
      localStorage.removeItem('cookie_twitch_user');
      localStorage.removeItem('is_authenticated');
      
      // Обновляем состояние
      setIsAuthenticated(false);
      setUserId(null);
      setUserLogin(null);
      setUserAvatar(null);
      
      return true;
    } catch (error) {
      console.error('Ошибка при выходе:', error);
      return false;
    }
  }, []);
  
  // Проверяем авторизацию при загрузке
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('Инициализация AuthContext');
      
      try {
        // Сначала устанавливаем, что инициализация началась
        setIsInitialized(false);
        
        // Флаг для отслеживания, авторизованы ли мы уже с помощью localstorage
        const isAlreadyAuthenticated = localStorage.getItem('is_authenticated') === 'true';
        
        // Проверяем все возможные места хранения токена
        const accessToken = localStorage.getItem('cookie_twitch_access_token') || 
                          localStorage.getItem('twitch_token') || 
                          Cookies.get('twitch_access_token');
                          
        // Проверяем все возможные места хранения данных пользователя
        const userSources = {
          localStorage: localStorage.getItem('twitch_user'),
          cookieInLS: localStorage.getItem('cookie_twitch_user'),
          cookie: Cookies.get('twitch_user'),
          cookieData: Cookies.get('twitch_user_data')
        };
        
        // Берем первый доступный источник данных
        let userDataStr = userSources.localStorage || 
                        userSources.cookieInLS || 
                        userSources.cookie || 
                        userSources.cookieData;
        
        const sourceInfo = {
          fromLocalStorage: !!userSources.localStorage,
          fromCookieInLS: !!userSources.cookieInLS,
          fromCookie: !!userSources.cookie,
          fromCookieData: !!userSources.cookieData
        };
        
        console.log('Найденные данные:', { 
          hasToken: !!accessToken, 
          hasUserData: !!userDataStr,
          isAlreadyAuthenticated,
          rawUserData: userDataStr ? userDataStr.substring(0, 50) + '...' : 'отсутствует',
          ...sourceInfo
        });
        
        let userData = null;
        
        // Парсим строку если она есть
        if (userDataStr) {
          try {
            userData = typeof userDataStr === 'string' ? JSON.parse(userDataStr) : userDataStr;
            
            // Логируем доступные ключи
            console.log('Доступные ключи в данных пользователя:', Object.keys(userData));
            
            const extractedUserId = userData.id || userData.twitchId;
            const extractedUserLogin = userData.login || userData.display_name || 
                                    userData.displayName || userData.username || 'Пользователь';
            const extractedUserAvatar = userData.profile_image_url || userData.avatar;
            
            console.log('Извлеченные данные пользователя:', {
              id: extractedUserId,
              login: extractedUserLogin,
              avatar: extractedUserAvatar ? extractedUserAvatar.substring(0, 30) + '...' : 'отсутствует'
            });
            
            // Проверяем обязательные поля
            if (!extractedUserId) {
              console.warn('ВНИМАНИЕ: ID пользователя отсутствует в данных');
            }
            
            if (!extractedUserLogin) {
              console.warn('ВНИМАНИЕ: Логин пользователя отсутствует в данных');
            }
            
            // Если у нас есть хотя бы ID (обязательное поле), считаем пользователя авторизованным
            if (extractedUserId) {
              // Устанавливаем состояние авторизации
              setIsAuthenticated(true);
              setUserId(extractedUserId);
              setUserLogin(extractedUserLogin);
              
              if (extractedUserAvatar) {
                setUserAvatar(extractedUserAvatar);
              }
              
              // Сохраняем данные в localStorage для последующего использования
              localStorage.setItem('is_authenticated', 'true');
              
              // Сохраняем полные данные пользователя
              const userDataToStore = {
                id: extractedUserId,
                twitchId: userData.twitchId || extractedUserId,
                username: extractedUserLogin,
                displayName: userData.displayName || userData.display_name || extractedUserLogin,
                avatar: extractedUserAvatar
              };
              
              localStorage.setItem('twitch_user', JSON.stringify(userDataToStore));
              
              // Устанавливаем куку для middleware
              Cookies.set('has_local_storage_token', 'true', { 
                expires: 1, // 1 день
                path: '/',
                sameSite: 'lax'
              });
              
              console.log('Авторизация успешна для пользователя:', extractedUserId, 'с логином:', extractedUserLogin);
              setIsInitialized(true);
              return;
            }
          } catch (e) {
            console.error('Ошибка при парсинге данных пользователя:', e, 'Исходные данные:', userDataStr);
          }
        }
        
        // Если дошли сюда, значит не удалось авторизоваться
        // Но проверим, может у нас есть токен без пользовательских данных
        if (accessToken) {
          console.log('Найден токен доступа, но нет данных пользователя. Попытка получить данные с сервера...');
          
          try {
            // TODO: Запрос на сервер для получения данных пользователя
            // Пока просто считаем авторизацию неуспешной
            setIsAuthenticated(false);
            setUserId(null);
            setUserLogin('');
            setUserAvatar('');
            
            localStorage.removeItem('is_authenticated');
          } catch (tokenError) {
            console.error('Ошибка при получении данных пользователя с сервера:', tokenError);
          }
        } else {
          // Нет ни токена, ни данных пользователя
          setIsAuthenticated(false);
          setUserId(null);
          setUserLogin('');
          setUserAvatar('');
          
          localStorage.removeItem('is_authenticated');
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Ошибка при инициализации авторизации:', error);
        
        // При ошибке устанавливаем безопасные значения
        setIsAuthenticated(false);
        setUserId(null);
        setUserLogin('');
        setUserAvatar('');
        
        localStorage.removeItem('is_authenticated');
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, []);
  
  // Мемоизируем значение контекста для предотвращения лишних ререндеров
  const contextValue = useMemo(() => ({
    isAuthenticated,
    userId,
    userLogin,
    userAvatar,
    isInitialized,
    login,
    logout,
    setUserLogin,
    setUserAvatar
  }), [isAuthenticated, userId, userLogin, userAvatar, isInitialized, login, logout, setUserLogin, setUserAvatar]);
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Хук для использования контекста авторизации
export const useAuth = () => useContext(AuthContext); 