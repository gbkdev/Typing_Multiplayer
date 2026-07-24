import { Link } from 'react-router-dom'
import { RegisterForm } from '@/features/auth/RegisterForm'

export function RegisterPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12">
      <h1 className="font-mono text-xl text-ink-100">Create account</h1>
      <RegisterForm />
      <p className="text-sm text-ink-400">
        Already have an account?{' '}
        <Link to="/login" className="text-caret hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
