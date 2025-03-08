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
        // Проверяем наличие токена в cookies
        const token = Cookies.get('twitch_token');
        const userData = localStorage.getItem('twitch_user');
        
        if (token && userData) {
          try {
            const user = JSON.parse(userData);
            setIsAuthenticated(true);
            setUserId(user.id);
            setUserLogin(user.login);
            setUserAvatar(user.profile_image_url);
          } catch (e) {
            console.error('Ошибка при парсинге данных пользователя:', e);
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Ошибка при проверке авторизации:', error);
        setIsAuthenticated(false);
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
      Cookies.set('twitch_token', token, { expires: 7 });
      localStorage.setItem('twitch_user', JSON.stringify(user));
      setIsAuthenticated(true);
      setUserId(user.id);
      setUserLogin(user.login);
      setUserAvatar(user.profile_image_url);
    } catch (error) {
      console.error('Ошибка при входе в систему:', error);
    }
  };
  
  // Функция для выхода из системы
  const logout = () => {
    try {
      Cookies.remove('twitch_token');
      localStorage.removeItem('twitch_user');
      setIsAuthenticated(false);
      setUserId(null);
      setUserLogin(null);
      setUserAvatar(null);
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