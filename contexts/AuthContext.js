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
      // Проверяем, на клиенте или на сервере
      if (typeof window !== 'undefined') {
        // На клиенте не создаем JWT токен, так как секретный ключ недоступен
        console.log('Пропускаем создание JWT токена на клиенте');
        return;
      }
      
      const token = createJwtToken(user);
      if (token) {
        Cookies.set('auth_token', token, { expires: 7, path: '/' });
      }
    } catch (error) {
      console.error('Ошибка при создании JWT токена:', error);
      // Игнорируем ошибку, продолжаем работу без JWT токена
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
  useEffect(() => {
    const initializeAuth = () => {
      console.log('Инициализация AuthContext');
      
      try {
        // Сначала проверяем наличие токена и данных пользователя в localStorage
        const hasToken = !!localStorage.getItem('cookie_twitch_access_token') || 
                         !!localStorage.getItem('twitch_token') || 
                         !!Cookies.get('twitch_access_token');
                         
        const userDataStr = localStorage.getItem('twitch_user') || Cookies.get('twitch_user');
        
        if (!hasToken || !userDataStr) {
          console.log('Токен или данные пользователя отсутствуют, пользователь не аутентифицирован');
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
          setIsAuthenticated(false);
          setIsInitialized(true);
          return;
        }
        
        // Устанавливаем состояние авторизации
        setIsAuthenticated(true);
        setUserId(userData.id);
        setUserLogin(userData.login || userData.display_name);
        setUserAvatar(userData.profile_image_url);
        
        // Устанавливаем флаг авторизации в localStorage
        localStorage.setItem('is_authenticated', 'true');
        
        console.log('AuthContext: пользователь успешно аутентифицирован:', userData.id);
      } catch (error) {
        console.error('Ошибка при инициализации AuthContext:', error);
        setIsAuthenticated(false);
      } finally {
        // В любом случае устанавливаем флаг инициализации
        setIsInitialized(true);
      }
    };
    
    // Запускаем инициализацию с небольшой задержкой
    setTimeout(initializeAuth, 100);
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