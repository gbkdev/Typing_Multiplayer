import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  accentColor: string
  soundEnabled: boolean
  keyboardSoundsEnabled: boolean
  setAccentColor: (color: string) => void
  toggleSound: () => void
  toggleKeyboardSounds: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      accentColor: '#e8c14a',
      soundEnabled: true,
      keyboardSoundsEnabled: false,
      setAccentColor: (color) => set({ accentColor: color }),
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleKeyboardSounds: () => set((s) => ({ keyboardSoundsEnabled: !s.keyboardSoundsEnabled })),
    }),
    { name: 'typerace-app-settings' }
  )
)
