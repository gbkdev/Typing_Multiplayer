import { useLocation, useNavigate } from 'react-router-dom'
import { ChooseUsernameForm } from '@/features/auth/ChooseUsernameForm'

export function SetupUsernamePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <h1 className="font-mono text-xl text-ink-100">Choose your username</h1>
      <p className="max-w-sm text-sm text-ink-400">
        This is how you appear on leaderboards, in rooms, and on your profile. Pick something unique — you can
        change it later from your profile.
      </p>
      <ChooseUsernameForm
        onSuccess={() => {
          navigate(from && from !== '/setup-username' ? from : '/', { replace: true })
        }}
      />
    </div>
  )
}
