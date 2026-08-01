import { useEffect, useRef, useState } from 'react'
import { Settings2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/cn'
import { THEMES } from '@/lib/themes'

const accentPresets = ['#e8c14a', '#7fd88f', '#6fb8e0', '#e8637a', '#c084fc']

export function SettingsMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const {
    accentColor,
    themeId,
    soundEnabled,
    keyboardSoundsEnabled,
    setAccentColor,
    setThemeId,
    toggleSound,
    toggleKeyboardSounds,
  } = useAppStore()

  useEffect(() => {
    if (!open) return
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickAway)
    return () => document.removeEventListener('mousedown', onClickAway)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-ink-400 hover:text-ink-100"
        aria-label="Settings"
      >
        <Settings2 className="size-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 w-64 glass-panel p-4 flex flex-col gap-4 text-sm">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-widest text-ink-500">Theme</p>
            <div className="flex flex-wrap gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  title={t.label}
                  onClick={() => {
                    setThemeId(t.id)
                    setAccentColor(t.vars['--color-caret'])
                  }}
                  className={cn(
                    'flex size-8 items-center justify-center rounded-full border-2 overflow-hidden',
                    themeId === t.id ? 'border-ink-100' : 'border-transparent'
                  )}
                  style={{
                    background: `linear-gradient(135deg, ${t.swatch[0]} 50%, ${t.swatch[1]} 50%)`,
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] uppercase tracking-widest text-ink-500">Accent color</p>
            <div className="flex gap-2">
              {accentPresets.map((c) => (
                <button
                  key={c}
                  aria-label={`Set accent color ${c}`}
                  onClick={() => setAccentColor(c)}
                  className={cn(
                    'size-6 rounded-full border-2',
                    accentColor === c ? 'border-ink-100' : 'border-transparent'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between">
            Sound effects
            <input type="checkbox" checked={soundEnabled} onChange={toggleSound} className="accent-caret" />
          </label>

          <label className="flex items-center justify-between">
            Keyboard clicks
            <input
              type="checkbox"
              checked={keyboardSoundsEnabled}
              onChange={toggleKeyboardSounds}
              className="accent-caret"
            />
          </label>

          <p className="text-[10px] text-ink-500">
            Reduced motion is respected automatically from your OS accessibility settings.
          </p>
        </div>
      )}
    </div>
  )
}
