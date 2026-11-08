import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { SupabaseConfig } from './config'
import { normalizeUrl } from './config'

export function createSupabaseClient(config: SupabaseConfig): SupabaseClient {
  return createClient(normalizeUrl(config.url), config.anonKey.trim(), {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // ক্লায়েন্ট-অনলি অ্যাপ: ইমেইলের লিংক যেকোনো ব্রাউজার/ডিভাইসে খুললেও যেন কাজ করে।
      // PKCE-তে link-টি যে ব্রাউজারে চাওয়া হয়েছিল সেখানেই খুলতে হয়, নাহলে verifier মেলে না।
      flowType: 'implicit',
    },
  })
}

export interface ConnectionCheck {
  ok: boolean
  message: string
}

export async function testSupabaseConnection(config: SupabaseConfig): Promise<ConnectionCheck> {
  try {
    const client = createSupabaseClient(config)
    const { error: authError } = await client.auth.getSession()
    if (authError) return { ok: false, message: authError.message }

    const { error: tableError } = await client.from('messes').select('id').limit(1)
    if (tableError) {
      if (tableError.code === '42P01' || tableError.message.toLowerCase().includes('does not exist')) {
        return {
          ok: false,
          message: 'Supabase-এ SQL schema পাওয়া যায়নি। আগে supabase/schema.sql ফাইলটি SQL Editor-এ চালান।',
        }
      }
      if (tableError.code === '401' || tableError.message.toLowerCase().includes('jwt')) {
        return { ok: false, message: 'Anon key-টি সঠিক নয়। Project Settings → API থেকে আবার কপি করুন।' }
      }
      return { ok: false, message: tableError.message }
    }

    return { ok: true, message: 'Supabase-এর সাথে সংযোগ হয়েছে।' }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'সংযোগ করা যায়নি। URL ও key আবার যাচাই করুন।',
    }
  }
}
