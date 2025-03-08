import { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';

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
  
  // Проверяем авторизацию при загрузке
  useEffect(() => {
    const checkAuth = () => {
      try {
        // Проверяем наличие токена в cookies или localStorage
        const token = Cookies.get('twitch_access_token') || 
                      localStorage.getItem('cookie_twitch_access_token') || 
                      Cookies.get('twitch_token');
                      
        // Проверяем наличие данных пользователя
        const userData = Cookies.get('twitch_user') || 
                         localStorage.getItem('cookie_twitch_user') || 
                         localStorage.getItem('twitch_user');
        
        console.log('AuthContext: Проверка авторизации', {
          hasToken: !!token,
          hasUserData: !!userData
        });
        
        if (token && userData) {
          try {
            // Пытаемся распарсить данные пользователя
            const user = typeof userData === 'string' ? JSON.parse(userData) : userData;
            
            setIsAuthenticated(true);
            setUserId(user.id);
            setUserLogin(user.login || user.display_name);
            setUserAvatar(user.profile_image_url);
            
            // Устанавливаем флаг авторизации в localStorage
            localStorage.setItem('is_authenticated', 'true');
            
            console.log('AuthContext: Пользователь авторизован', {
              id: user.id,
              login: user.login || user.display_name
            });
          } catch (e) {
            console.error('Ошибка при парсинге данных пользователя:', e);
            setIsAuthenticated(false);
            localStorage.removeItem('is_authenticated');
          }
        } else {
          console.log('AuthContext: Пользователь не авторизован (нет токена или данных)');
          setIsAuthenticated(false);
          localStorage.removeItem('is_authenticated');
        }
      } catch (error) {
        console.error('Ошибка при проверке авторизации:', error);
        setIsAuthenticated(false);
        localStorage.removeItem('is_authenticated');
      }
    };
    
    checkAuth();
    
    // Добавляем слушатель события для обновления состояния авторизации
    window.addEventListener('storage', checkAuth);
    
    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, []);
  
  // Функция для входа в систему
  const login = (token, user) => {
    try {
      // Сохраняем токен в cookies и localStorage для надежности
      Cookies.set('twitch_token', token, { expires: 7 });
      Cookies.set('twitch_access_token', token, { expires: 7 });
      localStorage.setItem('cookie_twitch_access_token', token);
      
      // Сохраняем данные пользователя
      const userStr = typeof user === 'string' ? user : JSON.stringify(user);
      localStorage.setItem('twitch_user', userStr);
      localStorage.setItem('cookie_twitch_user', userStr);
      Cookies.set('twitch_user', userStr, { expires: 7 });
      
      // Устанавливаем флаг авторизации
      localStorage.setItem('is_authenticated', 'true');
      
      // Обновляем состояние контекста
      setIsAuthenticated(true);
      setUserId(user.id);
      setUserLogin(user.login || user.display_name);
      setUserAvatar(user.profile_image_url);
      
      console.log('AuthContext: Пользователь успешно вошел в систему', {
        id: user.id,
        login: user.login || user.display_name
      });
    } catch (error) {
      console.error('Ошибка при входе в систему:', error);
    }
  };
  
  // Функция для выхода из системы
  const logout = () => {
    try {
      // Удаляем все токены и данные пользователя
      Cookies.remove('twitch_token');
      Cookies.remove('twitch_access_token');
      Cookies.remove('twitch_refresh_token');
      Cookies.remove('twitch_user');
      
      localStorage.removeItem('twitch_user');
      localStorage.removeItem('cookie_twitch_access_token');
      localStorage.removeItem('cookie_twitch_refresh_token');
      localStorage.removeItem('cookie_twitch_user');
      localStorage.removeItem('is_authenticated');
      
      // Обновляем состояние контекста
      setIsAuthenticated(false);
      setUserId(null);
      setUserLogin(null);
      setUserAvatar(null);
      
      console.log('AuthContext: Пользователь вышел из системы');
    } catch (error) {
      console.error('Ошибка при выходе из системы:', error);
    }
  };
  
  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userId,
        userLogin,
        userAvatar,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Хук для использования контекста авторизации
export function useAuth() {
  return useContext(AuthContext);
} 