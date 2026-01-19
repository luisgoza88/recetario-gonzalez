-- Agregar política INSERT para la tabla recipes
-- Esto permite guardar recetas generadas por IA

-- Primero verificamos si RLS está habilitado y agregamos políticas si no existen
DO $$
BEGIN
  -- Verificar si la política ya existe antes de crearla
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'recipes' AND policyname = 'Allow insert on recipes'
  ) THEN
    -- Crear política para INSERT
    EXECUTE 'CREATE POLICY "Allow insert on recipes" ON recipes FOR INSERT WITH CHECK (true)';
  END IF;

  -- También asegurar que SELECT esté permitido
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'recipes' AND policyname = 'Allow select on recipes'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow select on recipes" ON recipes FOR SELECT USING (true)';
  END IF;

  -- Y UPDATE para poder editar recetas
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'recipes' AND policyname = 'Allow update on recipes'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow update on recipes" ON recipes FOR UPDATE USING (true)';
  END IF;

  -- Y DELETE para poder eliminar recetas
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'recipes' AND policyname = 'Allow delete on recipes'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow delete on recipes" ON recipes FOR DELETE USING (true)';
  END IF;
END $$;

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE 'Políticas RLS para recipes configuradas correctamente';
END $$;
