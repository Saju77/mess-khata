export interface SupabaseConfig {
  url: string
  anonKey: string
}

const CONFIG_KEY = 'messkhata.supabase.v1'
const MODE_KEY = 'messkhata.mode.v1'
const ACTIVE_MESS_KEY = 'messkhata.activeMess.v1'

const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

export const hasEnvConfig = Boolean(envUrl && envKey)

export function loadConfig(): SupabaseConfig | null {
  if (hasEnvConfig) {
    return { url: envUrl as string, anonKey: envKey as string }
  }
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SupabaseConfig>
    if (!parsed.url || !parsed.anonKey) return null
    return { url: parsed.url, anonKey: parsed.anonKey }
  } catch {
    return null
  }
}

export function saveConfig(config: SupabaseConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

export function clearConfig() {
  if (!hasEnvConfig) localStorage.removeItem(CONFIG_KEY)
}

export type AppMode = 'cloud' | 'demo'

export function loadMode(): AppMode | null {
  const raw = localStorage.getItem(MODE_KEY)
  if (raw === 'demo' || raw === 'cloud') return raw
  return loadConfig() ? 'cloud' : null
}

export function saveMode(mode: AppMode) {
  localStorage.setItem(MODE_KEY, mode)
}

export function clearMode() {
  localStorage.removeItem(MODE_KEY)
}

export function loadActiveMessId(): string | null {
  return localStorage.getItem(ACTIVE_MESS_KEY)
}

export function saveActiveMessId(id: string | null) {
  if (id) localStorage.setItem(ACTIVE_MESS_KEY, id)
  else localStorage.removeItem(ACTIVE_MESS_KEY)
}

export function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

export function validConfigShape(url: string, key: string): boolean {
  try {
    const u = new URL(normalizeUrl(url))
    return (u.protocol === 'https:' || u.protocol === 'http:') && key.trim().length > 20
  } catch {
    return false
  }
}
