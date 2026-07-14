import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function walk(dir: string, files: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.git') continue
    const path = join(dir, name)
    const st = statSync(path)
    if (st.isDirectory()) walk(path, files)
    else if (/\.(ts|tsx|js|jsx|env|md)$/.test(name) && !name.includes('.test.')) files.push(path)
  }
  return files
}

describe('admin security invariants', () => {
  it('does not expose service role key via VITE_ env usage in frontend src', () => {
    const srcRoot = join(process.cwd(), 'src')
    const files = walk(srcRoot)
    const offenders: string[] = []
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      if (/VITE_.*SERVICE_ROLE|SERVICE_ROLE_KEY/.test(text)) {
        offenders.push(file.replace(process.cwd(), ''))
      }
    }
    expect(offenders).toEqual([])
  })

  it('keeps admin privileged calls behind functions.invoke admin-api', () => {
    const api = readFileSync(join(process.cwd(), 'src/services/admin/api.ts'), 'utf8')
    expect(api).toContain("functions.invoke('admin-api'")
    expect(api).not.toContain('SERVICE_ROLE')
  })
})
