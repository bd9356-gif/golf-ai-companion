import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing env vars', url: !!supabaseUrl, key: !!supabaseKey })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error, count } = await supabase
      .from('videos')
      .select('id, title', { count: 'exact' })
      .limit(3)

    if (error) return NextResponse.json({ error: error.message })

    return NextResponse.json({ success: true, count, sample: data })

  } catch (err) {
    return NextResponse.json({ error: err.message })
  }
}