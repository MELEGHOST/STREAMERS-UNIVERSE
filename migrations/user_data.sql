-- Создание таблицы для хранения данных пользователя
CREATE TABLE IF NOT EXISTS user_data (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  data_type VARCHAR(255) NOT NULL,
  data_value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, data_type)
);

-- Создание индекса для быстрого поиска по user_id
CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON user_data(user_id);

-- Создание индекса для быстрого поиска по data_type
CREATE INDEX IF NOT EXISTS idx_user_data_type ON user_data(data_type);

-- Комментарии к таблице
COMMENT ON TABLE user_data IS 'Таблица для хранения различных данных пользователя';
COMMENT ON COLUMN user_data.user_id IS 'ID пользователя';
COMMENT ON COLUMN user_data.data_type IS 'Тип данных (followers, followings, preferences и т.д.)';
COMMENT ON COLUMN user_data.data_value IS 'Данные в формате JSON или текст';
COMMENT ON COLUMN user_data.created_at IS 'Дата создания записи';
COMMENT ON COLUMN user_data.updated_at IS 'Дата последнего обновления записи'; 