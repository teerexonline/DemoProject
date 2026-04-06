/**
 * Shared utility for running Python scraper subprocesses from API routes.
 */
import { spawn } from 'child_process'
import path      from 'path'

export function runScript(
  scriptName: string,
  args: string[],
  timeoutMs: number = 90_000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', scriptName)
    const pythonBin  = process.platform === 'win32' ? 'python' : 'python3'

    const child = spawn(pythonBin, [scriptPath, ...args], {
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (c: Buffer) => { stdout += c.toString() })
    child.stderr.on('data', (c: Buffer) => { stderr += c.toString() })

    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error(`${scriptName} timed out after ${timeoutMs / 1000}s`))
    }, timeoutMs)

    child.on('close', code => {
      clearTimeout(timer)
      if (code !== 0 && !stdout.trim()) {
        reject(new Error(`exit ${code}: ${stderr.slice(-400)}`))
      } else {
        resolve(stdout.trim())
      }
    })

    child.on('error', err => {
      clearTimeout(timer)
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new Error('Python not found. Install Python 3 and run: pip install -r scripts/requirements.txt'))
      } else {
        reject(err)
      }
    })
  })
}
