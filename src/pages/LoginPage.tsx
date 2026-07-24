import { Link } from 'react-router-dom'
import { LoginForm } from '@/features/auth/LoginForm'

export function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12">
      <h1 className="font-mono text-xl text-ink-100">Sign in</h1>
      <LoginForm />
      <p className="text-sm text-ink-400">
        No account?{' '}
        <Link to="/register" className="text-caret hover:underline">
          Create one
        </Link>
      </p>
    </div>
  )
}
