import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getCurrentFiscalYear } from '../utils/budget'

interface AppState {
  selectedFiscalYear: number
  setSelectedFiscalYear: (year: number) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedFiscalYear: getCurrentFiscalYear(),
      setSelectedFiscalYear: (year) => set({ selectedFiscalYear: year }),
    }),
    { name: 'teammanager-app' }
  )
)
