import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import type { UserProfile } from '../types'
import { supabase } from '../lib/supabase'
import { getCurrentProfile } from '../lib/db'

interface AuthState {
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  setSession: (s: Session | null) => void
  initialize: () => Promise<() => void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  loading: true,

  setSession: (session) => set({ session }),

  initialize: async () => {
    // 15초 안에 세션을 못 가져오면 강제로 loading 해제 — fetch timeout(30s)과 역할 분리
    // 실제 cold start는 페이지별 로딩 스피너가 처리하므로 초기 인증은 빠르게 해제
    const safetyTimer = setTimeout(() => set({ loading: false }), 15_000)

    try {
      const { data } = await supabase.auth.getSession()
      const session = data.session
      set({ session, loading: false })
      if (session?.user) {
        const profile = await getCurrentProfile(session.user.id)
        set({ profile })
      }
    } catch {
      set({ loading: false })
    } finally {
      clearTimeout(safetyTimer)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        window.location.hash = '/reset-password'
        return
      }
      set({ session })
      // 프로필 재조회는 실제 로그인/로그아웃 시에만 수행 (TOKEN_REFRESHED 등 제외)
      if (event === 'SIGNED_IN') {
        if (session?.user) {
          try {
            const profile = await getCurrentProfile(session.user.id)
            set({ profile })
          } catch {
            // 프로필 로드 실패 시 세션은 유지, 프로필만 null 유지
          }
        }
      } else if (event === 'SIGNED_OUT') {
        set({ profile: null })
      }
    })
    return () => subscription.unsubscribe()
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ session: null, profile: null })
  },
}))
