import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { RootLayout } from '@/layouts/RootLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'

// Route-level code splitting keeps the initial bundle lean — recharts,
// framer-motion heavy pages, and multiplayer logic load on demand.
import { HomePage } from '@/pages/HomePage'
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const LeaderboardPage = lazy(() => import('@/pages/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage })))
const DailyChallengePage = lazy(() =>
  import('@/pages/DailyChallengePage').then((m) => ({ default: m.DailyChallengePage }))
)
const RoomsPage = lazy(() => import('@/pages/RoomsPage').then((m) => ({ default: m.RoomsPage })))
const RoomPage = lazy(() => import('@/pages/RoomPage').then((m) => ({ default: m.RoomPage })))
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const PublicProfilePage = lazy(() =>
  import('@/pages/PublicProfilePage').then((m) => ({ default: m.PublicProfilePage }))
)
const MessagesPage = lazy(() => import('@/pages/MessagesPage').then((m) => ({ default: m.MessagesPage })))
const SetupUsernamePage = lazy(() =>
  import('@/pages/SetupUsernamePage').then((m) => ({ default: m.SetupUsernamePage }))
)
const AuthCallbackPage = lazy(() => import('@/pages/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))

function PageFallback() {
  return (
    <div className="flex justify-center py-24">
      <Loader2 className="size-6 animate-spin text-caret" />
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="auth/callback" element={<AuthCallbackPage />} />
          <Route
            path="setup-username"
            element={
              <ProtectedRoute>
                <SetupUsernamePage />
              </ProtectedRoute>
            }
          />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="daily" element={<DailyChallengePage />} />
          <Route path="rooms" element={<RoomsPage />} />
          <Route
            path="rooms/:roomId"
            element={
              <ProtectedRoute>
                <RoomPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="messages"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="messages/:userId"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />
          <Route path="u/:username" element={<PublicProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
