# Collaborative BI Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add date-level drill detail and clean up the daily report board for shared BI usage.

**Architecture:** Keep the current React/Vite structure. Add detail-row view-model functions in `performanceAnalysis.ts`, render a segmented detail mode in `PerformanceAnalysisPage.tsx`, and adjust the Daily Report board CSS/markup without changing the import pipeline.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Vite, Netlify static deploy.

---

### Task 1: Performance Date Detail Model

**Files:**
- Modify: `src/features/performance/performanceAnalysis.ts`
- Modify: `src/features/performance/performanceAnalysis.test.ts`

- [ ] Add a failing test that builds daily detail rows from two records on different dates and verifies date, campaign, creative, and metrics.
- [ ] Implement `DailyDetailRow` and `buildDailyDetailRows(records, currentDimension, contributionMetric)`.
- [ ] Sort rows by date descending, spend descending, then dimension value.
- [ ] Run `npm test -- src/features/performance/performanceAnalysis.test.ts`.

### Task 2: Performance Detail Mode UI

**Files:**
- Modify: `src/features/performance/PerformanceAnalysisPage.tsx`
- Modify: `src/app/App.test.tsx`
- Modify: `src/app/styles.css`

- [ ] Add a failing page test that switches to `每日明细` and expects date-level columns and campaign/creative text.
- [ ] Add a two-button segmented control in the detail heading.
- [ ] Render existing aggregate rows in `汇总视图`.
- [ ] Render daily detail rows in `每日明细`.
- [ ] Keep search working against date, dimension, campaign, ad group, and creative.

### Task 3: Daily Report Board Layout

**Files:**
- Modify: `src/features/daily-report/DailyReportBoardPage.tsx`
- Modify: `src/features/daily-report/DailyReportBoardPage.test.tsx`
- Modify: `src/app/styles.css`

- [ ] Add or update a page test that asserts module order is country, campaign, then creative.
- [ ] Make the campaign pivot table first business column compact and sticky.
- [ ] Keep the metric column compact but not visually detached.
- [ ] Keep date columns visible and horizontally scrollable.

### Task 4: Verification And Release

**Files:**
- No production file changes expected.

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Open the local app and verify the homepage and performance detail mode render without console errors.
- [ ] Commit all scoped files.
- [ ] Push `main` for Netlify auto-deploy.
