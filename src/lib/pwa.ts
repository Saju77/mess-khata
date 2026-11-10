import { registerSW } from 'virtual:pwa-register'
import { toast } from 'sonner'

const RELOAD_FLAG = 'messkhata.pwa.reload'
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000 // 1 hour
const VERSION_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes

let swRegistration: ServiceWorkerRegistration | undefined
let updateInProgress = false
let reloadScheduled = false

function safeReload() {
  if (reloadScheduled) return
  reloadScheduled = true
  // Use a short delay to let the new SW activate
  window.setTimeout(() => {
    window.location.reload()
  }, 100)
}

function handleControllerChange() {
  if (updateInProgress) {
    safeReload()
  }
}

export function setupPwaUpdates() {
  if (!('serviceWorker' in navigator)) return

  // Prevent multiple reloads
  if (sessionStorage.getItem(RELOAD_FLAG)) {
    sessionStorage.removeItem(RELOAD_FLAG)
  }

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // New SW available — activate it
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

      // Listen for controller change (new SW took control)
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

      // Check for updates on visibility change
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          void registration.update().catch(() => {})
        }
      })

      // Periodic update check
      window.setInterval(() => {
        if (document.visibilityState === 'visible') {
          void registration.update().catch(() => {})
        }
      }, UPDATE_CHECK_INTERVAL)
    },
  })

  // Version-based deployment detection
  startVersionCheck()
}

async function startVersionCheck() {
  const currentVersion = import.meta.env.VITE_APP_VERSION
  if (!currentVersion) return

  async function checkVersion() {
    try {
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
      })
      if (!response.ok) return
      const data = (await response.json()) as { version?: string }
      if (data.version && data.version !== currentVersion) {
        // New deployment detected — trigger SW update
        if (swRegistration) {
          await swRegistration.update().catch(() => {})
        }
        // If no new SW detected within 10s, force reload
        window.setTimeout(() => {
          if (!updateInProgress) {
            sessionStorage.setItem(RELOAD_FLAG, '1')
            window.location.reload()
          }
        }, 10000)
      }
    } catch {
      // Network error — ignore
    }
  }

  // Check on load
  void checkVersion()

  // Check periodically
  window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      void checkVersion()
    }
  }, VERSION_CHECK_INTERVAL)

  // Check on visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void checkVersion()
    }
  })
}
