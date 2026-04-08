import { NextRequest } from 'next/server'
import { spawn } from 'child_process'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const { prompt } = await req.json()
  if (!prompt) return new Response('prompt required', { status: 400 })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      const claudeBin = process.env.CLAUDE_BIN ?? '/Users/teerex/.local/bin/claude'
      const proc = spawn(claudeBin, ['--dangerously-skip-permissions', '-p', prompt], {
        cwd: process.cwd(),
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      proc.stdout.on('data', (d: Buffer) => controller.enqueue(encoder.encode(d.toString())))
      proc.stderr.on('data', (d: Buffer) => controller.enqueue(encoder.encode(d.toString())))
      proc.on('close', () => controller.close())
      proc.on('error', (e: Error) => {
        controller.enqueue(encoder.encode(`Error: ${e.message}\n`))
        controller.close()
      })
    },
  })

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
