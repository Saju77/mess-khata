const MESSAGES: Record<string, string> = {
  'invalid login credentials': 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।',
  'email not confirmed': 'ইমেইলটি এখনো যাচাই হয়নি। ইনবক্সে পাঠানো লিংকে ক্লিক করুন।',
  'user already registered': 'এই ইমেইলে আগে থেকেই একটি অ্যাকাউন্ট আছে। লগইন করুন।',
  'password should be at least 6 characters': 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।',
  'signup is disabled': 'এই প্রজেক্টে নতুন অ্যাকাউন্ট খোলা বন্ধ আছে।',
  'invalid code': 'ইনভাইট কোডটি সঠিক নয়।',
  'not authenticated': 'আপনি লগইন করা নেই। আবার লগইন করুন।',
  'not manager': 'এই কাজটি শুধু ম্যানেজার করতে পারবেন।',
  'cannot remove yourself': 'নিজেকে মেস থেকে সরানো যায় না।',
  'manager cannot leave': 'ম্যানেজার মেস ছাড়তে পারবেন না।',
  'name required': 'মেসের নাম লিখুন।',
  'invalid login': 'লগইন তথ্য সঠিক নয়।',
  'failed to fetch': 'ইন্টারনেট সংযোগ পাওয়া যাচ্ছে না। সংযোগ চেক করে আবার চেষ্টা করুন।',
  'networkerror': 'ইন্টারনেট সংযোগ পাওয়া যাচ্ছে না। সংযোগ চেক করে আবার চেষ্টা করুন।',
  'jwt expired': 'সেশনের সময় শেষ। আবার লগইন করুন।',
  'row-level security': 'এই তথ্যে আপনার অনুমতি নেই।',
  "could not find the table 'public.activity_log'":
    'ডেটাবেস আপডেট এখনো সম্পূর্ণ হয়নি। GitHub Actions-এ Supabase schema deploy সফল হয়েছে কিনা দেখুন।',
}

export function friendlyError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.trim()
    const lower = msg.toLowerCase()
    for (const [key, value] of Object.entries(MESSAGES)) {
      if (lower.includes(key)) return value
    }
    if (msg.length > 0 && msg.length < 180) return msg
    return 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।'
  }
  return 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।'
}

export function errorMessage(error: unknown): string {
  return friendlyError(error)
}
