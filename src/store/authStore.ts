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
  loadProfile: (userId: string) => Promise<void>
  initialize: () => Promise<() => void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  loading: true,

  setSession: (session) => set({ session }),

  loadProfile: async (userId) => {
    const profile = await getCurrentProfile(userId)
    set({ profile })
  },

  initialize: async () => {
    const { data } = await supabase.auth.getSession()
    const session = data.session
    set({ session, loading: false })
    if (session?.user) {
      const profile = await getCurrentProfile(session.user.id)
      set({ profile })
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
          const profile = await getCurrentProfile(session.user.id)
          set({ profile })
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
