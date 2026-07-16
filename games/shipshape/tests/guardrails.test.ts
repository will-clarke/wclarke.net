/**
 * Architecture guardrails. These must stay green after EVERY task.
 * ⛔ Never weaken these tests. If one fails, your change is wrong, not the test.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const CORE = join(HERE, '..', 'src', 'core')
const HARNESS = join(HERE, '..', 'harness')

function tsFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.ts'))
    .map((e) => join(e.parentPath, e.name))
}

const FORBIDDEN_IN_CORE: [RegExp, string][] = [
  [/Math\.random/, 'use the injected Prng (src/core/prng.ts)'],
  [/Date\.now/, 'sim time is state.tick; wall-clock breaks determinism'],
  [/new Date\(/, 'sim time is state.tick'],
  [/\bdocument\b/, 'core must be headless'],
  [/\bwindow\b/, 'core must be headless'],
  [/\bnavigator\b/, 'core must be headless'],
  [/localStorage/, 'persistence lives in src/ui'],
  [/requestAnimationFrame/, 'core must be headless'],
  [/from ['"]\.\.\/ui/, 'core never imports ui'],
  [/from ['"]node:/, 'core must run in the browser too - no node builtins'],
]

describe('guardrails', () => {
  it('src/core is deterministic and headless', () => {
    for (const file of tsFiles(CORE)) {
      const src = readFileSync(file, 'utf8')
      for (const [pattern, why] of FORBIDDEN_IN_CORE) {
        expect(pattern.test(src), `${file} matches ${pattern} - ${why}`).toBe(false)
      }
    }
  })

  it('harness never imports ui, never uses Math.random/Date.now for sim-affecting work', () => {
    for (const file of tsFiles(HARNESS)) {
      const src = readFileSync(file, 'utf8')
      expect(/from ['"].*\/ui\//.test(src), `${file} imports src/ui`).toBe(false)
      expect(/Math\.random/.test(src), `${file} uses Math.random - policies must use ctx.prng`).toBe(false)
    }
  })

  it('params.ts contains no per-tick units (grep heuristic)', () => {
    const src = readFileSync(join(CORE, 'params.ts'), 'utf8')
    expect(/perTick|PerTick|_TICKS|ticksPer/i.test(src)).toBe(false)
  })
})
