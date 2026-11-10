import { registerSW } from 'virtual:pwa-register'
import { toast } from 'sonner'

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000 // 1 hour
const VERSION_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes
const RELOAD_GUARD = 'messkhata.pwa.reloaded'

let swRegistration: ServiceWorkerRegistration | undefined
let updateInProgress = false
let reloadScheduled = false

// Track the controller at initial load to detect real updates (not first install)
const initialController = navigator.serviceWorker?.controller ?? null

function isUserActive(): boolean {
  // Don't reload if user is typing or has unsaved input
  const active = document.activeElement
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) {
    return true
  }
  // Check if any form has dirty state
  const forms = document.querySelectorAll('form')
  for (const form of forms) {
    const inputs = form.querySelectorAll('input, textarea, select')
    for (const input of inputs) {
      if (input instanceof HTMLInputElement && input.value !== input.defaultValue) {
        return true
      }
    }
  }
  return false
}

function safeReload() {
  if (reloadScheduled) return
  if (isUserActive()) {
    // Defer reload until user is idle
    window.setTimeout(safeReload, 5000)
    return
  }
  reloadScheduled = true
  sessionStorage.setItem(RELOAD_GUARD, '1')
  window.setTimeout(() => {
    window.location.reload()
  }, 200)
}

function handleControllerChange() {
  // Only reload if there was a previous controller (not first install)
  if (!initialController) return
  if (reloadScheduled) return
  if (sessionStorage.getItem(RELOAD_GUARD)) return
  safeReload()
}

export function setupPwaUpdates() {
  if (!('serviceWorker' in navigator)) return

  // Clear reload guard from previous session
  if (sessionStorage.getItem(RELOAD_GUARD)) {
    sessionStorage.removeItem(RELOAD_GUARD)
  }

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
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

      // Listen for controller change (new SW took control) — safe reload
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

      // Periodic update check (only when visible)
      window.setInterval(() => {
        if (document.visibilityState === 'visible' && !updateInProgress) {
          void registration.update().catch(() => {})
        }
      }, UPDATE_CHECK_INTERVAL)

      // Check on visibility change (only when visible)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !updateInProgress) {
          void registration.update().catch(() => {})
        }
      })
    },
  })

  // Version-based deployment detection
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
        // New deployment detected — trigger SW update (SW lifecycle handles reload via controllerchange)
        if (swRegistration) {
          await swRegistration.update().catch(() => {})
        }
        // Fallback: if no SW update detected within 15s, reload once (if user is not active)
        window.setTimeout(() => {
          if (!updateInProgress && !sessionStorage.getItem(RELOAD_GUARD) && !isUserActive()) {
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
