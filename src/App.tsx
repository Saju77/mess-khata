import { Component, type ErrorInfo, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AlertTriangle, Loader2, UtensilsCrossed } from 'lucide-react'
import { AppProvider, useApp } from './context/AppContext'
import { AppShell } from './components/AppShell'
import { Button } from './components/ui'
import { WelcomePage } from './pages/WelcomePage'
import { AuthPage } from './pages/AuthPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { DashboardPage } from './pages/DashboardPage'
import { MealsPage } from './pages/MealsPage'
import { BazarPage } from './pages/BazarPage'
import { DepositsPage } from './pages/DepositsPage'
import { OtherCostsPage } from './pages/OtherCostsPage'
import { MembersPage } from './pages/MembersPage'
import { SummaryPage } from './pages/SummaryPage'
import { ActivityPage } from './pages/ActivityPage'
import { SettingsPage } from './pages/SettingsPage'

function BrandMark() {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-lg shadow-teal-900/20">
        <UtensilsCrossed className="h-6 w-6" aria-hidden />
      </span>
      <div className="text-center">
        <p className="text-lg font-bold tracking-tight text-slate-900">মেস খাতা</p>
        <p className="mt-0.5 text-[10px] font-medium tracking-[0.18em] text-slate-400">MESS KHATA</p>
      </div>
    </div>
  )
}

function LoadingScreen({ label = 'লোড হচ্ছে...' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-4">
      <BrandMark />
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin text-teal-700" aria-hidden />
        {label}
      </div>
    </div>
  )
}

function AppRoutes() {
  const { booting, mode, config, user, memberships, membershipsLoaded } = useApp()
  const location = useLocation()

  if (location.pathname.replace(/\/+$/, '') === '/reset-password') {
    if (booting) return <LoadingScreen label="লিংক যাচাই করা হচ্ছে..." />
    return <ResetPasswordPage />
  }

  if (booting) return <LoadingScreen />

  if (!mode || (mode === 'cloud' && !config)) {
    return <WelcomePage />
  }

  if (!user) {
    return <AuthPage />
  }

  if (!membershipsLoaded) {
    return <LoadingScreen label="আপনার মেস খোঁজা হচ্ছে..." />
  }

  if (memberships.length === 0) {
    return <OnboardingPage />
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="meals" element={<MealsPage />} />
        <Route path="bazar" element={<BazarPage />} />
        <Route path="deposits" element={<DepositsPage />} />
        <Route path="other" element={<OtherCostsPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="summary" element={<SummaryPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

interface ErrorBoundaryState {
  hasError: boolean
  message: string
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'অজানা সমস্যা',
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Mess Khata crashed:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh items-center justify-center px-4">
          <div className="card w-full max-w-md p-6 text-center">
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-6 w-6" aria-hidden />
            </span>
            <h1 className="mt-4 text-lg font-bold text-slate-900">কিছু একটা সমস্যা হয়েছে</h1>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              অ্যাপটি আবার চালু করুন। সমস্যা থেকে গেলে ব্রাউজারের ক্যাশ মুছে আবার চেষ্টা করুন।
            </p>
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-400">
              {this.state.message}
            </p>
            <Button className="mt-5 w-full" onClick={() => window.location.reload()}>
              আবার চালু করুন
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <AppRoutes />
          <Toaster
            position="top-center"
            richColors
            closeButton
            toastOptions={{
              className: 'font-sans',
              duration: 3500,
            }}
          />
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
