import { createClient } from '@supabase/supabase-js'

const url  = import.meta.env.VITE_SUPABASE_URL  as string
const key  = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !key) {
  console.error('[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 환경변수가 없습니다.')
}

/** 모든 Supabase HTTP 요청에 15초 타임아웃 적용 — 네트워크 지연으로 인한 무한 로딩 방지 */
function fetchWithTimeout(timeoutMs: number) {
  return (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeoutMs)
    // 기존 signal이 있으면 함께 연결
    const signal = init?.signal
      ? anySignal([controller.signal, init.signal])
      : controller.signal
    return fetch(input, { ...init, signal }).finally(() => clearTimeout(id))
  }
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController()
  for (const signal of signals) {
    if (signal.aborted) { controller.abort(); break }
    signal.addEventListener('abort', () => controller.abort(), { once: true })
  }
  return controller.signal
}

export const supabase = createClient(url ?? '', key ?? '', {
  global: { fetch: fetchWithTimeout(15_000) },
})
