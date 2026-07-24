import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <p className="font-mono text-caret text-4xl">404</p>
      <p className="text-ink-400 text-sm">That page hasn't been typed yet.</p>
      <Link to="/" className="text-caret text-sm hover:underline">Back to typing</Link>
    </div>
  )
}
