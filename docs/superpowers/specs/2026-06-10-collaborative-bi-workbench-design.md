# Collaborative BI Workbench Design

## Goal

Make the BI usable as a shared web workbench for the user and friends, not just a local import preview. The UI should support repeated analysis after importing agency daily reports, with clear drill-down paths, date-level detail, and familiar patterns from Adjust and Firebase.

## Scope

- Improve the Performance Analysis page so the drill table can show date-level ad delivery detail instead of only one aggregate row.
- Improve the Daily Report board so Campaign and Creative tables read naturally, with less awkward blank space and a more useful module order.
- Keep channel naming dynamic. Labels such as `Mtg` are source data values, not hard-coded product labels.
- Keep the app fully static and Netlify-friendly for now. Multi-user work in this step means shared hosted access and a maintainable UI foundation, not accounts or shared cloud storage yet.

## Performance Analysis

The page keeps the current KPI, funnel, trend, and ranking modules, but the detail area gains a switch between two modes:

- `汇总视图`: the current dimension summary rows, still useful for choosing the next drill target.
- `每日明细`: date-level rows for the current drill context. Each row includes date, current dimension value, platform, account, country, OS, campaign, ad group, creative, spend, impressions, clicks, installs, registrations, payers, paid value, CTR, CVR, CPI, CPR, CPP, D0 ROAS, D1 retention, and D7 retention.

This follows an Adjust-like flow: choose or filter a hierarchy, then inspect daily delivery and conversion values without losing context.

## Daily Report Board

The board order becomes:

1. Country overview table.
2. Campaign daily pivot table.
3. Campaign and Creative daily pivot table.

The pivot layout changes so the first business object column stays visible, the metric column is compact, and date columns flow continuously to the right. This keeps the Firebase-like date matrix but avoids a large empty sticky area.

## Empty And Shared-Use Behavior

If a user has not imported data or filters down to no rows, the pages should explain what to do next instead of showing misleading empty charts. Labels and table headers should remain bilingual enough for mixed Chinese/English ad-platform terminology.

## Verification

- Unit tests cover date-level detail construction and dynamic channel naming.
- Page tests cover the new detail mode toggle and reordered Daily Report modules.
- Full `npm test` and `npm run build` must pass before pushing.
