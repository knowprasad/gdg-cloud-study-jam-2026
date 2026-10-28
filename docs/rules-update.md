# Rules update — 28 October 2026

Adopted rules are displayed at `/#rules`: badge credits with minimum4, curriculum best streak capped7, early finish capped15, attendance2 per dated session capped10, XP display-only, shared score ties, guild average across assigned roster. Profiles expose component totals and completed-badge details. Synthetic data now reconciles to these rules; no live student data is published.

Installed Code.gs, Group.gs and Scoring.gs in the bound organizer project. Ran applyEventRulesV5 after user completed Google authorization. Created five hidden organizer backup tabs; set Config G3:G10 to4,1,30,0,0,1,7,15; updated XP notes; removed unused dummy activities; renamed attendance configuration headers. Added Last successful check to Tracker. Inclusive cutoff, cached verified evidence on failures, safe refresh failure reporting, zero-profile inclusion and numeric XP formatting are implemented.

First refresh failed on typed-column formatting; guarded formatting was repaired and the next run completed SUCCESS. Export reconciliation verified: raw Form Responses1 unchanged, manual Tracker columns unchanged,493 profiles ranked, all XP score components0, totals reconcile, numeric XP format fixed, no cached formula errors. No guild names, heads, attendance records or registration deadlines invented/changed.

Checks: node scripts/verify-scoring.mjs; npm run build; node scripts/check-production.mjs; node scripts/check-scoring-ui.mjs. Browser ledger/rules checked320/390/1440 in both themes, zero profile and route navigation. Real website data integration remains pending.
