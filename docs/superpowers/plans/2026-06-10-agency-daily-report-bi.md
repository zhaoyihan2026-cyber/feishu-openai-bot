# Agency Daily Report BI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full agency daily report metrics to import, aggregation, dashboard, and performance analysis so imported CSVs drive a usable AF/Adjust-style BI workflow.

**Architecture:** Extend the existing `AcquisitionRecord` and `Metrics` model with optional report metrics, then centralize aggregate calculations in `src/domain/metrics.ts`. Import mapping and validation populate those fields; dashboard and performance pages consume the same aggregate metrics so all views stay consistent.

**Tech Stack:** React, TypeScript, Vite, Vitest, ECharts, PapaParse, xlsx.

---

### Task 1: Extend Import Field Mapping And Value Parsing

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/data/import/types.ts`
- Modify: `src/data/import/fieldMapping.ts`
- Modify: `src/data/import/valueParsing.ts`
- Test: `src/data/import/fieldMapping.test.ts`
- Test: `src/data/import/valueParsing.test.ts`

- [ ] **Step 1: Write failing tests**

Add expectations that all agency report headers map to import fields, and percent values parse as decimals:

```ts
expect(mapping.mappedFields).toMatchObject({
  d0Roas: "D0 ROAS",
  arppu: "ARPPU",
  paymentRate: "付费率",
  installRate: "IR",
  ctr: "CTR",
  cvr: "CVR",
  installRegistrationRate: "安装注册率",
  cpm: "CPM",
  cpc: "CPC",
  ipm: "IPM",
  cpi: "CPI",
  cpr: "CPR",
  cpp: "CPP",
  d1RetentionRate: "D1留存率",
  d7RetentionRate: "D7留存率",
  selected: "单选",
});
expect(parsePercentValue("16.23%", { required: false })).toEqual({
  ok: true,
  value: 0.1623,
});
```

- [ ] **Step 2: Verify tests fail**

Run: `PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm test -- src/data/import/fieldMapping.test.ts src/data/import/valueParsing.test.ts`

Expected: FAIL because new fields and `parsePercentValue` do not exist.

- [ ] **Step 3: Implement minimal mapping and parsing**

Add optional report fields to `AcquisitionRecord`, expose them as `ImportField`, add aliases, and add `parsePercentValue` that converts percent strings to decimals and plain numeric strings as already-decimal values.

- [ ] **Step 4: Verify tests pass**

Run the same focused test command and expect PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/types.ts src/data/import/types.ts src/data/import/fieldMapping.ts src/data/import/valueParsing.ts src/data/import/fieldMapping.test.ts src/data/import/valueParsing.test.ts
git commit -m "feat: map agency daily report fields"
```

### Task 2: Preserve Report Metrics During Import

**Files:**
- Modify: `src/data/import/recordValidation.ts`
- Test: `src/data/import/recordValidation.test.ts`
- Modify: `src/data/mock/records.ts`

- [ ] **Step 1: Write failing test**

Extend the IGS report row test so the created record preserves `d0Roas`, `arppu`, `paymentRate`, `installRate`, `ctr`, `cvr`, `installRegistrationRate`, `cpm`, `cpc`, `ipm`, `cpi`, `cpr`, `cpp`, `d1RetentionRate`, `d7RetentionRate`, and `selected`.

- [ ] **Step 2: Verify test fails**

Run: `PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm test -- src/data/import/recordValidation.test.ts`

Expected: FAIL because the optional metrics are not assigned.

- [ ] **Step 3: Implement minimal validation**

Parse report money metrics with `parseNumberValue`, report rates with `parsePercentValue`, and selected text as a trimmed string. Add deterministic defaults for mock records so existing app tests continue to type-check.

- [ ] **Step 4: Verify test passes**

Run the same focused test command and expect PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/import/recordValidation.ts src/data/import/recordValidation.test.ts src/data/mock/records.ts
git commit -m "feat: preserve agency report metrics"
```

### Task 3: Aggregate Report Metrics

**Files:**
- Modify: `src/domain/metrics.ts`
- Test: `src/domain/metrics.test.ts`

- [ ] **Step 1: Write failing test**

Add a test proving grouped metrics derive rates from aggregate totals and weight retention by installs:

```ts
expect(metrics.d0Roas).toBeCloseTo(150 / 300);
expect(metrics.arppu).toBeCloseTo(150 / 3);
expect(metrics.cvr).toBeCloseTo(30 / 100);
expect(metrics.cpm).toBeCloseTo((300 / 3000) * 1000);
expect(metrics.d7RetentionRate).toBeCloseTo((0.1 * 10 + 0.3 * 20) / 30);
```

- [ ] **Step 2: Verify test fails**

Run: `PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm test -- src/domain/metrics.test.ts`

Expected: FAIL because report aggregate fields are missing.

- [ ] **Step 3: Implement aggregation**

Extend `Metrics` with report metric fields and calculate derived metrics from totals. Use imported retention values only for weighted averages.

- [ ] **Step 4: Verify test passes**

Run the focused test command and expect PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/types.ts src/domain/metrics.ts src/domain/metrics.test.ts
git commit -m "feat: aggregate agency report metrics"
```

### Task 4: Surface Report Metrics In Dashboard

**Files:**
- Modify: `src/features/dashboard/dashboardViewModel.ts`
- Modify: `src/features/dashboard/dashboardPresentation.ts`
- Modify: `src/features/dashboard/DashboardPage.tsx`
- Test: `src/features/dashboard/dashboardPresentation.test.ts`
- Test: `src/features/dashboard/dashboardViewModel.test.ts`

- [ ] **Step 1: Write failing tests**

Assert dashboard KPI output includes D0 ROAS, CPR, CPP, D1 retention, and D7 retention. Assert daily series includes paid value and D0 ROAS.

- [ ] **Step 2: Verify tests fail**

Run: `PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm test -- src/features/dashboard/dashboardPresentation.test.ts src/features/dashboard/dashboardViewModel.test.ts`

Expected: FAIL because dashboard does not expose new metrics.

- [ ] **Step 3: Implement dashboard metrics**

Extend daily series and KPI generation using the aggregate metrics from Task 3. Keep existing charts intact and add a report trend chart if needed using existing ECharts patterns.

- [ ] **Step 4: Verify tests pass**

Run the same focused test command and expect PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/dashboardViewModel.ts src/features/dashboard/dashboardPresentation.ts src/features/dashboard/DashboardPage.tsx src/features/dashboard/*.test.ts
git commit -m "feat: show agency report metrics on dashboard"
```

### Task 5: Upgrade Performance Analysis Table

**Files:**
- Modify: `src/features/performance/performanceAnalysis.ts`
- Modify: `src/features/performance/performancePresentation.ts`
- Modify: `src/features/performance/PerformanceAnalysisPage.tsx`
- Test: `src/features/performance/performanceAnalysis.test.ts`

- [ ] **Step 1: Write failing tests**

Assert grouped dimension rows include report metrics such as impressions, clicks, activations, payers, paid value, CTR, CVR, CPI, CPR, CPP, D0 ROAS, D1 retention, and D7 retention.

- [ ] **Step 2: Verify tests fail**

Run: `PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm test -- src/features/performance/performanceAnalysis.test.ts`

Expected: FAIL before presentation columns are wired.

- [ ] **Step 3: Implement table columns**

Add columns for the daily report view while preserving existing drill behavior. Use `performanceFormatters.currency`, `.integer`, and `.percent` consistently.

- [ ] **Step 4: Verify tests pass**

Run focused tests and expect PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/performance/performanceAnalysis.ts src/features/performance/performancePresentation.ts src/features/performance/PerformanceAnalysisPage.tsx src/features/performance/performanceAnalysis.test.ts
git commit -m "feat: expand performance report table"
```

### Task 6: Full Verification And Publish

**Files:**
- No new files expected.

- [ ] **Step 1: Run full tests**

Run: `PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm test`

Expected: all test files pass.

- [ ] **Step 2: Run production build**

Run: `PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm run build`

Expected: build succeeds; the existing Vite chunk size warning is acceptable.

- [ ] **Step 3: Push main**

```bash
git push origin main
```

Expected: Netlify auto-deploys the updated BI link.
