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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session })
      if (session?.user) {
        const profile = await getCurrentProfile(session.user.id)
        set({ profile })
      } else {
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
