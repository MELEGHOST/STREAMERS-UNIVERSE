-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS "users" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "twitchId" TEXT UNIQUE NOT NULL,
  "username" TEXT NOT NULL,
  "displayName" TEXT,
  "email" TEXT,
  "avatar" TEXT,
  "userType" TEXT DEFAULT 'viewer',
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Создание таблицы подписок
CREATE TABLE IF NOT EXISTS "follows" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "follower_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "followed_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("follower_id", "followed_id")
);

-- Создание таблицы ролей пользователей
CREATE TABLE IF NOT EXISTS "userRoles" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "assignerId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "roleName" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("userId", "assignerId")
);

-- Создание RLS политик
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "follows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "userRoles" ENABLE ROW LEVEL SECURITY;

-- Политики для таблицы пользователей
CREATE POLICY "Публичный доступ на чтение пользователей" 
ON "users" FOR SELECT USING (true);

-- Политики для таблицы подписок
CREATE POLICY "Публичный доступ на чтение подписок" 
ON "follows" FOR SELECT USING (true);

-- Политики для таблицы ролей
CREATE POLICY "Публичный доступ на чтение ролей" 
ON "userRoles" FOR SELECT USING (true); 