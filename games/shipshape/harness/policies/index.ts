/**
 * Bot registry. Implemented in TASKS.md **T12** - one file per policy in this
 * directory, each exporting a Policy. Exact behavioural specs live in T12.
 */

import type { Policy } from '../types'

export const POLICIES: Record<string, Policy> = {
  // T12: random, turtle, greed, balanced, batteryRusher, crenellator
}
