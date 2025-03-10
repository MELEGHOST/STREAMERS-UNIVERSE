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
  
  // Проверяем авторизацию
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
      
      // Логируем состояние аутентификации для отладки
      console.log('Проверка аутентификации:', { 
        hasToken: !!token, 
        hasUserData: !!userData,
        isInitialized
      });
      
      // Если токен и данные пользователя отсутствуют, пользователь не аутентифицирован
      if (!token || !userData) {
        if (isAuthenticated) {
          console.log('Пользователь не аутентифицирован: отсутствует токен или данные пользователя');
          setIsAuthenticated(false);
          localStorage.removeItem('is_authenticated');
        }
        return;
      }

      // Пытаемся распарсить данные пользователя
      let user;
      try {
        user = typeof userData === 'string' ? JSON.parse(userData) : userData;
      } catch (e) {
        console.error('Ошибка при парсинге данных пользователя:', e);
        setIsAuthenticated(false);
        localStorage.removeItem('is_authenticated');
        return;
      }

      if (!user || !user.id) {
        console.warn('Данные пользователя некорректны');
        setIsAuthenticated(false);
        localStorage.removeItem('is_authenticated');
        return;
      }
      
      // Если пользователь уже аутентифицирован с теми же данными, не обновляем состояние
      if (isAuthenticated && userId === user.id && userLogin === (user.login || user.display_name)) {
        return;
      }
      
      // Устанавливаем состояние авторизации
      setIsAuthenticated(true);
      setUserId(user.id);
      setUserLogin(user.login || user.display_name);
      setUserAvatar(user.profile_image_url);
      
      // Устанавливаем флаг авторизации в localStorage
      localStorage.setItem('is_authenticated', 'true');
      
      // Создаем JWT токен, если его еще нет
      if (!Cookies.get('auth_token') && token) {
        try {
          // Пропускаем создание JWT токена на клиенте, чтобы избежать ошибок
          if (typeof window === 'undefined') {
            createAndSetJwtToken(user);
          }
        } catch (error) {
          console.warn('Не удалось создать JWT токен, но авторизация продолжена:', error);
          // Игнорируем ошибку, продолжаем работу без JWT токена
        }
      }
      
      console.log('Пользователь успешно аутентифицирован:', { 
        id: user.id, 
        login: user.login || user.display_name 
      });
    } catch (error) {
      console.error('Ошибка при проверке авторизации:', error);
      setIsAuthenticated(false);
      localStorage.removeItem('is_authenticated');
    }
  }, [createAndSetJwtToken, isAuthenticated, userId, userLogin]);
  
  // Проверяем авторизацию при загрузке
  useEffect(() => {
    // Флаг для предотвращения повторной проверки аутентификации
    let isCheckingAuth = false;
    
    // Устанавливаем таймаут для инициализации, чтобы избежать бесконечной загрузки
    const initTimeout = setTimeout(() => {
      if (!isInitialized) {
        console.warn('Таймаут инициализации аутентификации, принудительно устанавливаем isInitialized = true');
        setIsInitialized(true);
      }
    }, 2000); // 2 секунды таймаут вместо 5
    
    const checkAuthOnce = () => {
      if (!isCheckingAuth) {
        isCheckingAuth = true;
        checkAuth();
        setIsInitialized(true);
        isCheckingAuth = false;
      }
    };
    
    if (typeof window !== 'undefined') {
      try {
        // Выполняем проверку аутентификации только один раз при загрузке
        checkAuthOnce();
      } catch (error) {
        console.error('Ошибка при проверке аутентификации:', error);
        setIsInitialized(true);
      }
      
      // Слушаем изменения в localStorage
      const handleStorageChange = (event) => {
        // Игнорируем события отладки и события, не связанные с аутентификацией
        if (event.key === 'auth_debug_state' || 
            (event.key !== 'is_authenticated' && 
             event.key !== 'twitch_user' && 
             event.key !== 'cookie_twitch_user' && 
             event.key !== 'cookie_twitch_access_token')) {
          return;
        }
        
        // Проверяем аутентификацию при изменении данных
        checkAuthOnce();
      };
      
      // Добавляем слушатель события
      window.addEventListener('storage', handleStorageChange);
      
      // Удаляем слушатель при размонтировании
      return () => {
        clearTimeout(initTimeout);
        window.removeEventListener('storage', handleStorageChange);
      };
    }
    
    return () => clearTimeout(initTimeout);
  }, [checkAuth, isInitialized]);
  
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