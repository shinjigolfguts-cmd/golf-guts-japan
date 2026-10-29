# Small read-only correction regression proposal

Intended repository candidates only:
- scripts/check-known-corrections.mjs
- scripts/list-review-required.mjs
- scripts/tests/corrections.test.mjs

No large fixtures, external packages, network, eval or input writes. Tests generate minimal data in memory, and the CLI test removes its temporary directory via test.after.

## Run
1. `node --test scripts/tests/corrections.test.mjs`
2. `node scripts/check-known-corrections.mjs PATH/data.js`
3. `node scripts/list-review-required.mjs normalized-changes.json > review-required.json`

Step 2 fixes the narrowly agreed historical regressions: 571 card/detail range250yd17stalls; 383 separate Kuroishi IC distance45km booking2026-10-25 and time60min official2026-10-29 sources. It rejects obsolete45min in displayed assertions but allows audit basis explaining the old value. It is not proof of present-day accuracy forever; intentional later fact changes require an independently reviewed test update.

Step 3 returns exit2 if manual review is required, exit1 for malformed input and exit0 when no lexical candidates were found. Do not treat exit0 as comprehensive semantic clearance. It lists removed number/unit, mode, weekday, fee/reservation/use-condition tokens. A retained number inside a rewritten assertion is also listed: A-station10km cannot be cleared merely because B-station10km exists. Output is review evidence only, not an automatic correctness judgment or a restore instruction.

## Required manual review before publication
For each record, record reviewer/date, ID/field, old/new assertion, facility identity, exact starting point/route, mode, applicable plan/season/weekday/party size, both source URLs and their original verification dates. Classify:
- `supported_correction`: same fact/conditions were corrected using explicit new evidence. Explain why old value should not survive.
- `preserve_separately`: a different fact/route/distance/condition was lost and not disproved. Keep original source/date; do not promote it to current official confirmation. Use visible evidence segments.
- `hold`: identity, source conflict, availability or visible attribution unresolved. Exclude change.
- `not_material`: candidate is only lexical/rephrasing; explain where the same fact/condition remains.

No unreviewed record is publication-ready. Never restore an old claim solely because the scan found deletion. After decisions, regenerate data/hash references, rerun publication gate and fixed regressions, then verify actual public HTML/UI after the sole editor publishes. Keep separate checks for stale facts left behind versus old facts removed.

## This run
14 synthetic tests pass. Actual japan-distance383-candidate-data.js passes fixed regressions. The 271-change comparison produces review candidates and exit2 as intended. The results are scratch evidence, not additional repository fixtures. Original data/repository were not modified.
