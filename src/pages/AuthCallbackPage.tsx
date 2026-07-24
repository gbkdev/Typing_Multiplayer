import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (sessionError) {
          setError(sessionError.message)
          return
        }
        if (data.session) {
          navigate('/', { replace: true })
        } else {
          setError('Sign-in could not be completed. Try again.')
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Sign-in failed.')
      })
  }, [navigate])

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm text-incorrect">{error}</p>
        <button onClick={() => navigate('/login', { replace: true })} className="text-sm text-caret hover:underline">
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <div className="flex justify-center py-24">
      <Loader2 className="size-6 animate-spin text-caret" />
    </div>
  )
}
