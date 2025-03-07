import Cookies from 'js-cookie';

// Функция для установки куки
export const setCookie = (name, value, options = {}) => {
  try {
    const defaultOptions = {
      path: '/',
      secure: false, // Для локальной разработки
      sameSite: 'lax',
    };
    
    const cookieOptions = { ...defaultOptions, ...options };
    Cookies.set(name, value, cookieOptions);
    console.log(`Кука ${name} успешно установлена`);
    return true;
  } catch (error) {
    console.error(`Ошибка при установке куки ${name}:`, error);
    return false;
  }
};

// Функция для получения куки
export const getCookie = (name) => {
  try {
    const value = Cookies.get(name);
    console.log(`Получение куки ${name}:`, value ? 'найдена' : 'не найдена');
    return value;
  } catch (error) {
    console.error(`Ошибка при получении куки ${name}:`, error);
    return null;
  }
};

// Функция для удаления куки
export const removeCookie = (name) => {
  try {
    Cookies.remove(name, { path: '/' });
    console.log(`Кука ${name} успешно удалена`);
    return true;
  } catch (error) {
    console.error(`Ошибка при удалении куки ${name}:`, error);
    return false;
  }
};

// Функция для проверки наличия куки
export const hasCookie = (name) => {
  try {
    const exists = !!Cookies.get(name);
    console.log(`Проверка наличия куки ${name}:`, exists ? 'существует' : 'не существует');
    return exists;
  } catch (error) {
    console.error(`Ошибка при проверке наличия куки ${name}:`, error);
    return false;
  }
};

// Функция для установки куки на стороне клиента из данных, полученных от сервера
export const setClientCookiesFromServer = (userData) => {
  try {
    if (userData) {
      setCookie('twitch_user', JSON.stringify(userData));
      console.log('Данные пользователя успешно сохранены в куки на стороне клиента');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Ошибка при установке куки на стороне клиента:', error);
    return false;
  }
}; 