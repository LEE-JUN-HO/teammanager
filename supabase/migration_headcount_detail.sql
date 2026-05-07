-- Migration: monthly_headcounts에 기초인원/입사자/퇴사자 컬럼 추가
-- Supabase SQL Editor에서 실행하세요.

ALTER TABLE public.monthly_headcounts
  ADD COLUMN IF NOT EXISTS begin_headcount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS new_hires       integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS departures      integer NOT NULL DEFAULT 0;

-- headcount 컬럼은 기말인원으로 사용 (기초 + 입사 - 퇴사)
COMMENT ON COLUMN public.monthly_headcounts.begin_headcount IS '기초인원';
COMMENT ON COLUMN public.monthly_headcounts.new_hires       IS '입사자';
COMMENT ON COLUMN public.monthly_headcounts.departures      IS '퇴사자';
COMMENT ON COLUMN public.monthly_headcounts.headcount       IS '기말인원 (= 기초 + 입사 - 퇴사)';
