import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import Cookies from 'js-cookie';
import { createJwtToken } from '../app/utils/auth';
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
  
  // Создаем JWT токен и устанавливаем его в куки
  const createAndSetJwtToken = useCallback((user) => {
    try {
      const token = createJwtToken(user);
      if (token) {
        Cookies.set('auth_token', token, { expires: 7, path: '/' });
      }
    } catch (error) {
      console.error('Ошибка при создании JWT токена:', error);
    }
  }, []);
  
  // Функция для входа пользователя
  const login = useCallback((userData, token) => {
    try {
      if (!userData || !token) {
        console.error('Ошибка при входе: отсутствуют данные пользователя или токен');
        return false;
      }
      
      // Сохраняем токен в куки
      Cookies.set('twitch_access_token', token, { expires: 7, path: '/' });
      
      // Сохраняем данные пользователя в куки
      const userDataString = typeof userData === 'string' ? userData : JSON.stringify(userData);
      Cookies.set('twitch_user', userDataString, { expires: 7, path: '/' });
      
      // Сохраняем данные в localStorage для надежности
      localStorage.setItem('cookie_twitch_access_token', token);
      localStorage.setItem('cookie_twitch_user', userDataString);
      localStorage.setItem('twitch_user', userDataString);
      localStorage.setItem('is_authenticated', 'true');
      
      // Создаем JWT токен
      createAndSetJwtToken(userData);
      
      // Обновляем состояние
      setIsAuthenticated(true);
      setUserId(userData.id);
      setUserLogin(userData.login || userData.display_name);
      setUserAvatar(userData.profile_image_url);
      
      return true;
    } catch (error) {
      console.error('Ошибка при входе:', error);
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
  const checkAuth = useCallback(() => {
    try {
      // Проверяем наличие токена в cookies или localStorage
      const token = Cookies.get('auth_token') || 
                    Cookies.get('twitch_access_token') || 
                    localStorage.getItem('cookie_twitch_access_token') || 
                    Cookies.get('twitch_token');
                    
      // Проверяем наличие данных пользователя
      const userData = Cookies.get('twitch_user') || 
                       localStorage.getItem('cookie_twitch_user') || 
                       localStorage.getItem('twitch_user');
      
      if (token && userData) {
        try {
          // Пытаемся распарсить данные пользователя
          const user = typeof userData === 'string' ? JSON.parse(userData) : userData;
          
          // Устанавливаем состояние авторизации
          setIsAuthenticated(true);
          setUserId(user.id);
          setUserLogin(user.login || user.display_name);
          setUserAvatar(user.profile_image_url);
          
          // Устанавливаем флаг авторизации в localStorage
          localStorage.setItem('is_authenticated', 'true');
          
          // Создаем JWT токен, если его еще нет
          if (!Cookies.get('auth_token') && token) {
            createAndSetJwtToken(user);
          }
          
          // Сохраняем токен в localStorage для надежности
          if (!localStorage.getItem('cookie_twitch_access_token') && token) {
            localStorage.setItem('cookie_twitch_access_token', token);
          }
          
          // Сохраняем данные пользователя в localStorage для надежности
          if (!localStorage.getItem('cookie_twitch_user') && userData) {
            localStorage.setItem('cookie_twitch_user', typeof userData === 'string' ? userData : JSON.stringify(userData));
          }
        } catch (e) {
          console.error('Ошибка при парсинге данных пользователя:', e);
          setIsAuthenticated(false);
          localStorage.removeItem('is_authenticated');
        }
      } else {
        setIsAuthenticated(false);
        localStorage.removeItem('is_authenticated');
      }
    } catch (error) {
      console.error('Ошибка при проверке авторизации:', error);
      setIsAuthenticated(false);
      localStorage.removeItem('is_authenticated');
    } finally {
      // Устанавливаем флаг инициализации
      setIsInitialized(true);
    }
  }, [createAndSetJwtToken]);
  
  // Проверяем авторизацию при загрузке
  useEffect(() => {
    if (typeof window !== 'undefined') {
      checkAuth();
      
      // Создаем обработчик события storage
      const handleStorageChange = (event) => {
        if (event.key === 'is_authenticated' || 
            event.key === 'twitch_user' || 
            event.key === 'cookie_twitch_user' || 
            event.key === 'cookie_twitch_access_token') {
          checkAuth();
        }
      };
      
      // Добавляем слушатель события для обновления состояния авторизации
      window.addEventListener('storage', handleStorageChange);
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, [checkAuth]);
  
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