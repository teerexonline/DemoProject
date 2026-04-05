import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath }              from 'next/cache'
import { createClient }                from '@/lib/supabase/server'

/**
 * POST /api/revalidate-company
 * Body: { companyId: string }
 *
 * Busts the Next.js cache for a company profile page.
 * Called by Python scrapers after they write to Supabase directly,
 * so the next profile page visit reflects the fresh data.
 *
 * No auth guard — this only invalidates cache, writes nothing.
 * The worst a bad actor can do is trigger unnecessary revalidations.
 */
export async function POST(req: NextRequest) {
  try {
    const { companyId } = await req.json()
    if (!companyId || typeof companyId !== 'string') {
      return NextResponse.json({ error: 'companyId required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data } = await supabase
      .from('companies')
      .select('slug')
      .eq('id', companyId)
      .single()

    if (data?.slug) {
      revalidatePath(`/company/${data.slug}`)
    }

    return NextResponse.json({ ok: true, slug: data?.slug ?? null })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
