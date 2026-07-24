import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { Navbar } from '@/components/ui/Navbar'
import { SetupBanner } from '@/components/ui/SetupBanner'
import { UsernameGate } from '@/routes/UsernameGate'
import { useAppStore } from '@/store/useAppStore'

export function RootLayout() {
  const accentColor = useAppStore((s) => s.accentColor)

  useEffect(() => {
    document.documentElement.style.setProperty('--color-caret', accentColor)
  }, [accentColor])

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
