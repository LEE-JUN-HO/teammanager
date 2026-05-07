-- Migration: traffic_light_config에 budget_per_person 컬럼 추가
-- Supabase SQL Editor에서 실행하세요.

ALTER TABLE public.traffic_light_config
  ADD COLUMN IF NOT EXISTS budget_per_person integer NOT NULL DEFAULT 50000;

UPDATE public.traffic_light_config
  SET budget_per_person = 50000
  WHERE id = 1;

COMMENT ON COLUMN public.traffic_light_config.budget_per_person IS '인당 월 예산 (원)';
