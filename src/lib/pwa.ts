import { registerSW } from 'virtual:pwa-register'
import { toast } from 'sonner'

const RELOAD_GUARD = 'messkhata.pwa.reloaded'
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000 // 1 hour
const VERSION_CHECK_INTERVAL = 10 * 60 * 1000 // 10 minutes

let swRegistration: ServiceWorkerRegistration | undefined
let updateInProgress = false

export function setupPwaUpdates() {
  if (!('serviceWorker' in navigator)) return

  // Clear reload guard from previous session
  // (sessionStorage persists across reloads within same tab session)
  const justReloaded = sessionStorage.getItem(RELOAD_GUARD)
  if (justReloaded) {
    sessionStorage.removeItem(RELOAD_GUARD)
  }

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // A new SW is waiting — activate it
      if (updateInProgress) return
      updateInProgress = true
      toast.info('নতুন version পাওয়া গেছে, আপডেট হচ্ছে...', { duration: 2000 })
      void updateSW(true)
    },
    onOfflineReady() {
      // App is ready for offline use
    },
    onRegisteredSW(_swUrl, registration) {
      swRegistration = registration
      if (!registration) return

      // Periodic update check (only when visible)
      window.setInterval(() => {
        if (document.visibilityState === 'visible' && !updateInProgress) {
          void registration.update().catch(() => {})
        }
      }, UPDATE_CHECK_INTERVAL)

      // Check on visibility change (only when visible, not on every focus)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !updateInProgress) {
          void registration.update().catch(() => {})
        }
      })
    },
  })

  // Version-based deployment detection (passive — does NOT auto-reload)
  startVersionCheck()
}

async function startVersionCheck() {
  const currentVersion = import.meta.env.VITE_APP_VERSION
  if (!currentVersion) return

  let versionMismatchDetected = false

  async function checkVersion() {
    if (updateInProgress || versionMismatchDetected) return
    try {
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
      })
      if (!response.ok) return
      const data = (await response.json()) as { version?: string }
      if (data.version && data.version !== currentVersion) {
        versionMismatchDetected = true
        // New deployment detected — trigger SW update (SW lifecycle handles reload)
        if (swRegistration) {
          await swRegistration.update().catch(() => {})
        }
        // Fallback: if no SW update detected within 15s, reload once
        window.setTimeout(() => {
          if (!updateInProgress && !sessionStorage.getItem(RELOAD_GUARD)) {
            sessionStorage.setItem(RELOAD_GUARD, '1')
            window.location.reload()
          }
        }, 15000)
      }
    } catch {
      // Network error — ignore
    }
  }

  // Check on load (delayed to avoid blocking initial render)
  window.setTimeout(() => {
    void checkVersion()
  }, 5000)

  // Check periodically (only when visible)
  window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      void checkVersion()
    }
  }, VERSION_CHECK_INTERVAL)

  // Check on visibility change (only when visible)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void checkVersion()
    }
  })
}
