/**
 * Single-run executor + CLI. Implemented in TASKS.md **T11**.
 * CLI contract:  npm run sim -- --policy balanced --seed 42
 * prints one RunMetrics as pretty JSON and exits 0.
 */

import type { Policy, RunConfig, RunMetrics } from './types'

export function runOne(policy: Policy, config: RunConfig): RunMetrics {
  void policy; void config
  throw new Error('Not implemented - TASKS.md T11')
}

// CLI entry - replace in T11.
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('shipshape harness: not implemented yet - see TASKS.md T11')
}
