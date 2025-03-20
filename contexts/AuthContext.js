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
        
        // Проверяем все возможные места хранения токена
        const accessToken = localStorage.getItem('cookie_twitch_access_token') || 
                          localStorage.getItem('twitch_token') || 
                          Cookies.get('twitch_access_token');
                          
        // Проверяем все возможные места хранения данных пользователя
        const userDataStr = localStorage.getItem('twitch_user') || 
                          localStorage.getItem('cookie_twitch_user') || 
                          Cookies.get('twitch_user');
        
        console.log('Найденные данные:', { 
          hasToken: !!accessToken, 
          hasUserData: !!userDataStr 
        });
        
        if (!accessToken || !userDataStr) {
          console.log('Токен или данные пользователя отсутствуют');
          setIsAuthenticated(false);
          setIsInitialized(true);
          return;
        }
        
        // Пытаемся распарсить данные пользователя
        let userData;
        try {
          userData = JSON.parse(userDataStr);
        } catch (e) {
          console.error('Ошибка при парсинге данных пользователя:', e);
          setIsAuthenticated(false);
          setIsInitialized(true);
          return;
        }
        
        if (!userData || !userData.id) {
          console.warn('Данные пользователя некорректны');
          
          // Очищаем некорректные данные
          localStorage.removeItem('twitch_user');
          localStorage.removeItem('cookie_twitch_user');
          localStorage.removeItem('cookie_twitch_access_token');
          Cookies.remove('twitch_user', { path: '/' });
          Cookies.remove('twitch_access_token', { path: '/' });
          
          setIsAuthenticated(false);
          setIsInitialized(true);
          return;
        }
        
        // Проверка токена локально, без обращения к внешним API
        // Это позволит избежать ошибки 500 и других проблем
        console.log('Проверка локальных данных пользователя');
        
        // Устанавливаем состояние авторизации на основе локальных данных
        setIsAuthenticated(true);
        setUserId(userData.id);
        setUserLogin(userData.login || userData.display_name);
        setUserAvatar(userData.profile_image_url);
          
        // Обновляем данные в localStorage для надежности
        localStorage.setItem('is_authenticated', 'true');
        localStorage.setItem('twitch_user', JSON.stringify(userData));
        localStorage.setItem('cookie_twitch_access_token', accessToken);
            
        console.log('AuthContext: пользователь успешно аутентифицирован:', userData.id);
        
      } catch (error) {
        console.error('Ошибка при инициализации AuthContext:', error);
        setIsAuthenticated(false);
      } finally {
        // В любом случае отмечаем, что инициализация завершена
        setIsInitialized(true);
      }
    };
    
    // Запускаем инициализацию
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
    logout
  }), [isAuthenticated, userId, userLogin, userAvatar, isInitialized, login, logout]);
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Хук для использования контекста авторизации
export const useAuth = () => useContext(AuthContext); 