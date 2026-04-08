import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync } from 'fs'
import path from 'path'

export async function POST(req: NextRequest) {
  const { text } = await req.json()
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 })
  const filePath = path.join(process.cwd(), 'Execution.md')
  writeFileSync(filePath, text, 'utf8')
  return NextResponse.json({ ok: true })
}
