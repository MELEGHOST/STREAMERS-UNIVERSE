-- Функция для проверки существования таблицы
CREATE OR REPLACE FUNCTION table_exists(table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    exists boolean;
BEGIN
    SELECT COUNT(*) > 0 INTO exists
    FROM information_schema.tables
    WHERE table_schema = 'public' 
    AND table_name = $1;
    
    RETURN exists;
END;
$$;

-- Предоставление доступа к функции для анонимных пользователей
GRANT EXECUTE ON FUNCTION table_exists(text) TO anon; 