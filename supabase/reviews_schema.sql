-- Таблица отзывов
CREATE TABLE IF NOT EXISTS "reviews" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "author_name" TEXT NOT NULL, -- Имя автора отзыва (может отличаться от пользователя)
  "author_social_link" TEXT, -- Ссылка на социальную сеть автора
  "content" TEXT NOT NULL, -- Сгенерированный текст отзыва
  "sources" TEXT[] NOT NULL, -- Массив ссылок на источники
  "original_files" TEXT[] NOT NULL, -- Массив путей к оригинальным файлам в Storage
  "status" TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  "product_name" TEXT, -- Название продукта, о котором отзыв
  "category" TEXT, -- Категория продукта
  "rating" INTEGER, -- Рейтинг продукта (если есть)
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "approved_at" TIMESTAMPTZ,
  "approved_by" UUID REFERENCES "users"("id")
);

-- Таблица администраторов
CREATE TABLE IF NOT EXISTS "admin_users" (
  "user_id" UUID PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL DEFAULT 'moderator', -- moderator, admin, superadmin
  "granted_by" UUID REFERENCES "users"("id"),
  "granted_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Настройка RLS политик
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admin_users" ENABLE ROW LEVEL SECURITY;

-- Политики для таблицы отзывов
CREATE POLICY "Отзывы видны всем пользователям" ON "reviews"
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Пользователи могут создавать отзывы" ON "reviews"
  FOR INSERT WITH CHECK (auth.uid()::TEXT = user_id::TEXT);

CREATE POLICY "Пользователи могут видеть свои неопубликованные отзывы" ON "reviews"
  FOR SELECT USING (auth.uid()::TEXT = user_id::TEXT);

CREATE POLICY "Администраторы могут управлять отзывами" ON "reviews"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id::TEXT = auth.uid()::TEXT)
  );

-- Политики для таблицы администраторов
CREATE POLICY "Таблица администраторов видна администраторам" ON "admin_users"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id::TEXT = auth.uid()::TEXT)
  );

CREATE POLICY "Суперадмины могут управлять администраторами" ON "admin_users"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id::TEXT = auth.uid()::TEXT AND role = 'superadmin')
  );

-- Создание хранимых процедур для управления администраторами
CREATE OR REPLACE FUNCTION add_admin_user(admin_id UUID, admin_role TEXT, granter_id UUID) 
RETURNS UUID AS $$
DECLARE
  new_admin_id UUID;
BEGIN
  INSERT INTO admin_users (user_id, role, granted_by)
  VALUES (admin_id, admin_role, granter_id)
  RETURNING user_id INTO new_admin_id;
  
  RETURN new_admin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Обновление процедуры для создания всех таблиц
CREATE OR REPLACE FUNCTION create_all_tables()
RETURNS VOID AS $$
BEGIN
  -- Существующие таблицы
  -- (код из существующей процедуры create_tables)
  
  -- Новые таблицы для отзывов
  CREATE TABLE IF NOT EXISTS "reviews" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "author_name" TEXT NOT NULL,
    "author_social_link" TEXT,
    "content" TEXT NOT NULL,
    "sources" TEXT[] NOT NULL,
    "original_files" TEXT[] NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "product_name" TEXT,
    "category" TEXT,
    "rating" INTEGER,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "approved_at" TIMESTAMPTZ,
    "approved_by" UUID
  );

  CREATE TABLE IF NOT EXISTS "admin_users" (
    "user_id" UUID PRIMARY KEY,
    "role" TEXT NOT NULL DEFAULT 'moderator',
    "granted_by" UUID,
    "granted_at" TIMESTAMPTZ DEFAULT NOW()
  );
  
  -- Включить RLS
  ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "admin_users" ENABLE ROW LEVEL SECURITY;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Предоставить доступ к процедурам
GRANT EXECUTE ON FUNCTION add_admin_user(UUID, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_all_tables() TO anon, authenticated; 