import { registerSW } from 'virtual:pwa-register'
import { toast } from 'sonner'

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000 // 1 hour
const VERSION_CHECK_INTERVAL = 15 * 60 * 1000 // 15 minutes
const RELOAD_MARK = 'messkhata.pwa.reload-at'
const MIN_RELOAD_GAP = 60 * 1000 // never reload twice within a minute

let swRegistration: ServiceWorkerRegistration | undefined
let reloadScheduled = false
let reloadPending = false

function hasRecentReload(): boolean {
  const last = Number(sessionStorage.getItem(RELOAD_MARK) || 0)
  return Date.now() - last < MIN_RELOAD_GAP
}

function shouldWaitForUser(): boolean {
  // Never reload while the app is in the background — wait until it is visible.
  if (document.visibilityState !== 'visible') return true

  // Never reload while the user is typing.
  const active = document.activeElement
  if (!active) return false
  const tag = active.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return (active as HTMLElement).isContentEditable === true
}

function reloadOnceWhenSafe() {
  if (reloadScheduled || hasRecentReload()) return

  if (shouldWaitForUser()) {
    reloadPending = true
    window.setTimeout(reloadOnceWhenSafe, 3000)
    return
  }

  reloadScheduled = true
  reloadPending = false
  sessionStorage.setItem(RELOAD_MARK, String(Date.now()))
  toast.info('নতুন version ইনস্টল হয়েছে, আপডেট হচ্ছে...', { duration: 2000 })
  window.setTimeout(() => window.location.reload(), 1200)
}

export function setupPwaUpdates() {
  if (!('serviceWorker' in navigator)) return

  registerSW({
    immediate: true,
    // autoUpdate mode calls this exactly once after a new SW activates.
    // We use it to avoid interrupting the user mid-typing.
    onNeedReload() {
      reloadOnceWhenSafe()
    },
    onOfflineReady() {
      // App is ready for offline use
    },
    onRegisteredSW(_swUrl, registration) {
      swRegistration = registration
      if (!registration) return

      const checkForUpdate = () => {
        if (document.visibilityState !== 'visible') return
        void registration.update().catch(() => {})
      }

      // Periodic update check (only when visible)
      window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL)

      // Check when the tab/app becomes visible again
      document.addEventListener('visibilitychange', checkForUpdate)
    },
  })

  // If a reload was deferred while the app was hidden, apply it as soon as
  // the user returns (instead of waiting for the next retry timer).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && reloadPending) {
      reloadOnceWhenSafe()
    }
  })

  startVersionCheck()
}

async function startVersionCheck() {
  const currentVersion = import.meta.env.VITE_APP_VERSION
  if (!currentVersion) return

  // Only act on a mismatch once per page load. This prevents reload loops
  // if a CDN briefly serves mismatched bundle/version.json files.
  let mismatchHandled = false

  async function checkVersion() {
    if (mismatchHandled) return
    if (document.visibilityState !== 'visible') return

    try {
      const response = await fetch('/version.json', { cache: 'no-store' })
      if (!response.ok) return
      const data = (await response.json()) as { version?: string }
      if (!data.version || data.version === currentVersion) return

      mismatchHandled = true

      // A newer deployment exists. Ask the browser to fetch sw.js again.
      // If a new SW is found, autoUpdate activates it and reloads exactly once.
      // If sw.js is unchanged (stale CDN), nothing happens — no forced reload.
      if (swRegistration) {
        await swRegistration.update().catch(() => {})
      }
    } catch {
      // Network unavailable — try again later
    }
  }

  // Delayed so the first render is never blocked
  window.setTimeout(() => void checkVersion(), 10_000)
  window.setInterval(() => void checkVersion(), VERSION_CHECK_INTERVAL)

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkVersion()
  })
}
