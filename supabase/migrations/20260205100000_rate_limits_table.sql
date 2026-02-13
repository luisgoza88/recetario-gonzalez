-- =====================================================
-- FASE 2A: Tabla de rate limiting persistente
-- Reemplaza el rate limiting in-memory que no funciona
-- en entornos serverless (Vercel)
-- =====================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,          -- "userId:action" o "ip:action"
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  window_ms INTEGER NOT NULL,  -- duración de la ventana en ms
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice único para upserts atómicos
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits (key);

-- Índice para cleanup de entradas expiradas
CREATE INDEX IF NOT EXISTS idx_rate_limits_expiry
  ON rate_limits (window_start, window_ms);

-- RLS: solo lectura/escritura via service functions (no acceso directo)
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Función atómica: incrementar contador o crear entrada nueva
-- Retorna: allowed (boolean), count (integer), reset_at (timestamptz)
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_ms INTEGER
) RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, reset_at TIMESTAMPTZ) AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_entry RECORD;
BEGIN
  -- Intentar obtener la entrada existente
  SELECT * INTO v_entry FROM rate_limits WHERE key = p_key FOR UPDATE;

  IF v_entry IS NULL THEN
    -- No existe: crear nueva entrada
    INSERT INTO rate_limits (key, count, window_start, window_ms)
    VALUES (p_key, 1, v_now, p_window_ms)
    ON CONFLICT (key) DO UPDATE
      SET count = 1, window_start = v_now, window_ms = p_window_ms;

    RETURN QUERY SELECT true, 1, v_now + (p_window_ms || ' milliseconds')::interval;
    RETURN;
  END IF;

  -- Verificar si la ventana expiró
  IF v_now > v_entry.window_start + (v_entry.window_ms || ' milliseconds')::interval THEN
    -- Ventana expirada: reiniciar
    UPDATE rate_limits
    SET count = 1, window_start = v_now, window_ms = p_window_ms
    WHERE key = p_key;

    RETURN QUERY SELECT true, 1, v_now + (p_window_ms || ' milliseconds')::interval;
    RETURN;
  END IF;

  -- Ventana activa: verificar límite
  IF v_entry.count >= p_limit THEN
    -- Límite excedido
    RETURN QUERY SELECT false, v_entry.count,
      v_entry.window_start + (v_entry.window_ms || ' milliseconds')::interval;
    RETURN;
  END IF;

  -- Incrementar contador
  UPDATE rate_limits SET count = count + 1 WHERE key = p_key;

  RETURN QUERY SELECT true, v_entry.count + 1,
    v_entry.window_start + (v_entry.window_ms || ' milliseconds')::interval;
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función de cleanup: eliminar entradas expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM rate_limits
  WHERE now() > window_start + (window_ms || ' milliseconds')::interval;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permitir que usuarios autenticados llamen a las funciones RPC
GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_rate_limits() TO authenticated;
