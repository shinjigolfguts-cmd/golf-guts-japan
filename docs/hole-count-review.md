# Scoped hole-count regression guard

Read-only CLI. Node built-ins only; reads one `const DATA = <JSON>;` file with JSON.parse, never eval/imports data, writes stdout/stderr only. No fetch, network, output files, publishing, auto-correction or facts/date updating. No large fixture included.

```
node --test scripts/tests/check-hole-counts.test.mjs
node scripts/check-hole-counts.mjs /path/to/data.js
```
Exit 0 = scoped invariants pass; exit 1 = malformed input/regression/review required. Restricts checks to IDs 1081=18, 555=18, 1159=27, 238=36, 522=36, 1136=27, 1799=27. Requires explicit `計Nホール` in seven play texts and 1159/1799 feature, catches contradictory explicit totals, missing/duplicate IDs, and obsolete `9ホールのコース。` in target records. Legitimate component `各9ホール`, contextual basis and non-target genuine nine-hole facilities are allowed and never modified.

This is intentionally a narrow regression guard, NOT natural-language fact validation or a full-site hole-count audit. Other paraphrases of incorrect facts may escape it. A semantically valid wording that drops the explicit `計Nホール` fails for human review rather than being silently accepted. Historical quotes of the exact old sentence in a target record also need review. Pinned totals must not be automatically rewritten from URL200, No.9, OUT-only, a half-round, extension notice or repeated-nine plan.

## Evidence review procedure for intentional changes
1. Identify exact facility (name, address/phone, official page identity); exclude sister/neighbor cards and separate short-course facilities.
2. Inspect all distinct course subdivisions and official tables/images. Count actual physical holes, not one hole number, one OUT half, one playing plan, or `9 holes added` by itself. A nine-hole course repeated twice is still nine physical holes in that component.
3. Record source URL, saved HTML/image hash, embedded-image provenance, actual observation date and evidence scope. When visual tables support a count, inspect pixels.
4. Compare full before/current record and feature; preserve unrelated conditions. Check all relevant visible duplicates, not just play.
5. If evidence changes a pinned total, obtain independent review, update the documented invariant and tests deliberately, and let sole editor apply via current-head/before/CAS safeguards. Guard passing does not independently attest current official facts or deployment.

## Verification scope
12 synthetic tests plus current candidate data passed before publication. No scheduler, permission, pricing or ranking logic is changed by this read-only guard. Publication/actual browser evidence is recorded separately in correction audit logs.
