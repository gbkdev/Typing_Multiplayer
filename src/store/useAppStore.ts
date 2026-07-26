import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  accentColor: string
  soundEnabled: boolean
  keyboardSoundsEnabled: boolean
  showVirtualKeyboard: boolean
  setAccentColor: (color: string) => void
  toggleSound: () => void
  toggleKeyboardSounds: () => void
  toggleVirtualKeyboard: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      accentColor: '#e8c14a',
      soundEnabled: true,
      keyboardSoundsEnabled: false,
      showVirtualKeyboard: true,
      setAccentColor: (color) => set({ accentColor: color }),
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleKeyboardSounds: () => set((s) => ({ keyboardSoundsEnabled: !s.keyboardSoundsEnabled })),
      toggleVirtualKeyboard: () => set((s) => ({ showVirtualKeyboard: !s.showVirtualKeyboard })),
    }),
    { name: 'typerace-app-settings' }
  )
)
