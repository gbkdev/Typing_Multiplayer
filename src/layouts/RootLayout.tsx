import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { Navbar } from '@/components/ui/Navbar'
import { SetupBanner } from '@/components/ui/SetupBanner'
import { UsernameGate } from '@/routes/UsernameGate'
import { useAppStore } from '@/store/useAppStore'
import { applyTheme } from '@/lib/themes'

export function RootLayout() {
  const accentColor = useAppStore((s) => s.accentColor)
  const themeId = useAppStore((s) => s.themeId)

  useEffect(() => {
    applyTheme(themeId, accentColor)
  }, [themeId, accentColor])

  return (
    <div className="min-h-screen flex flex-col">
      <SetupBanner />
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">
        <UsernameGate>
          <Outlet />
        </UsernameGate>
      </main>
    </div>
  )
}
