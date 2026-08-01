import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  accentColor: string
  themeId: string
  soundEnabled: boolean
  keyboardSoundsEnabled: boolean
  showVirtualKeyboard: boolean
  setAccentColor: (color: string) => void
  setThemeId: (id: string) => void
  toggleSound: () => void
  toggleKeyboardSounds: () => void
  toggleVirtualKeyboard: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      accentColor: '#e8c14a',
      themeId: 'midnight',
      soundEnabled: true,
      keyboardSoundsEnabled: false,
      showVirtualKeyboard: true,
      setAccentColor: (color) => set({ accentColor: color }),
      setThemeId: (id) => set({ themeId: id }),
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleKeyboardSounds: () => set((s) => ({ keyboardSoundsEnabled: !s.keyboardSoundsEnabled })),
      toggleVirtualKeyboard: () => set((s) => ({ showVirtualKeyboard: !s.showVirtualKeyboard })),
    }),
    { name: 'typerace-app-settings' }
  )
)
