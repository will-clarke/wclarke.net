/**
 * Multi-run sweeps + aggregation. Implemented in TASKS.md **T13**.
 * CLI contract:  npm run sweep -- --runs 200 [--policy all] [--out report.json]
 * runs every policy × N seeds (seeds 1..N), prints per-policy aggregates
 * (median deathTick, median wavesSurvived, mean avgWeld, mean mountUtilisation,
 * death-cause counts) as a table + writes full RunMetrics[] JSON when --out.
 */

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('shipshape sweep: not implemented yet - see TASKS.md T13')
}
