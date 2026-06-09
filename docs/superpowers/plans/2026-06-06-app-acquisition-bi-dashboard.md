# App Acquisition BI Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local, responsive React BI dashboard for overseas App acquisition using standardized mock data, cross-platform KPIs, drill-down analysis, creative analysis, and anomaly reporting.

**Architecture:** A Vite React application uses a typed `DataProvider` boundary, pure metric/filter/anomaly functions, and page-focused feature modules. Global filters live in a small React context, while ECharts components receive already-aggregated view models so data calculations remain independently testable.

**Tech Stack:** React 19, TypeScript, Vite, React Router, ECharts, lucide-react, Vitest, Testing Library, Playwright

---

## File Structure

```text
.
├── index.html
├── package.json
├── playwright.config.ts
├── tsconfig.json
├── vite.config.ts
├── public/
│   └── creative-thumbnails/
│       ├── creator-workflow.webp
│       ├── finance-tracker.webp
│       └── wellness-routine.webp
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── App.test.tsx
│   │   ├── routes.tsx
│   │   └── styles.css
│   ├── components/
│   │   ├── charts/Chart.tsx
│   │   ├── data/DataTable.tsx
│   │   ├── feedback/ModuleState.tsx
│   │   ├── filters/GlobalFilters.tsx
│   │   ├── layout/AppShell.tsx
│   │   └── metrics/KpiStrip.tsx
│   ├── data/
│   │   ├── DataProvider.ts
│   │   ├── mock/MockDataProvider.ts
│   │   └── mock/records.ts
│   ├── domain/
│   │   ├── anomalies.test.ts
│   │   ├── anomalies.ts
│   │   ├── filters.test.ts
│   │   ├── filters.ts
│   │   ├── metrics.test.ts
│   │   ├── metrics.ts
│   │   └── types.ts
│   ├── features/
│   │   ├── creatives/CreativeAnalysisPage.tsx
│   │   ├── dashboard/DashboardPage.tsx
│   │   └── performance/PerformanceAnalysisPage.tsx
│   ├── state/
│   │   ├── FilterContext.test.tsx
│   │   └── FilterContext.tsx
│   ├── test/setup.ts
│   └── main.tsx
└── tests/
    └── dashboard.spec.ts
```

Each domain file owns pure business logic. Feature pages compose shared components and never calculate raw metrics inline. `MockDataProvider` is the only module aware of mock storage, making a future API provider replaceable.

### Task 1: Scaffold the Tested React Application

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/App.test.tsx`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Create package and tool configuration**

Use these scripts and dependencies in `package.json`:

```json
{
  "name": "app-acquisition-bi",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit",
    "e2e": "playwright test"
  },
  "dependencies": {
    "echarts": "^6.0.0",
    "lucide-react": "^0.468.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.52.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

Configure Vitest with `environment: "jsdom"` and `setupFiles: "./src/test/setup.ts"`.

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected: exit code 0 and a generated `package-lock.json`.

- [ ] **Step 3: Write the failing app smoke test**

```tsx
import { render, screen } from "@testing-library/react";
import { App } from "./App";

it("renders the dashboard product name", () => {
  render(<App />);
  expect(screen.getByText("海外 App 投放 BI")).toBeInTheDocument();
});
```

- [ ] **Step 4: Run the test and verify failure**

Run: `npm test -- src/app/App.test.tsx`

Expected: FAIL because `App` does not yet render the product name.

- [ ] **Step 5: Implement the minimum app shell**

```tsx
export function App() {
  return <h1>海外 App 投放 BI</h1>;
}
```

- [ ] **Step 6: Run tests and commit**

Run: `npm test -- src/app/App.test.tsx`

Expected: 1 passing test.

```bash
git add package.json package-lock.json index.html tsconfig.json vite.config.ts src
git commit -m "chore: scaffold acquisition BI app"
```

### Task 2: Define the Standard Data Model and Metric Engine

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/metrics.ts`
- Create: `src/domain/metrics.test.ts`

- [ ] **Step 1: Define the normalized record types**

```ts
export type Platform =
  | "Meta Ads"
  | "Google Ads"
  | "TikTok Ads"
  | "Microsoft Ads"
  | "LinkedIn Ads"
  | "X Ads";

export interface AcquisitionRecord {
  id: string;
  date: string;
  updatedAt: string;
  app: string;
  platform: Platform;
  account: string;
  country: string;
  os: "iOS" | "Android";
  campaign: string;
  adGroup: string;
  creative: string;
  creativeType: "Video" | "Image" | "Playable";
  thumbnail: string;
  impressions: number;
  clicks: number;
  installs: number;
  activations: number;
  payers: number;
  spendUsd: number;
  revenueD7Usd: number;
  revenueD30Usd: number;
  budgetUsd: number;
}

export interface Metrics {
  impressions: number;
  clicks: number;
  installs: number;
  activations: number;
  payers: number;
  spendUsd: number;
  revenueD7Usd: number;
  revenueD30Usd: number;
  ctr: number;
  cpi: number;
  activationRate: number;
  payerRate: number;
  d7Roas: number;
  d30Ltv: number;
}
```

- [ ] **Step 2: Write failing aggregation tests**

```ts
it("aggregates records and computes weighted metrics", () => {
  const metrics = aggregateMetrics([
    record({ impressions: 1000, clicks: 100, installs: 20, activations: 10, payers: 2, spendUsd: 40, revenueD7Usd: 20, revenueD30Usd: 50 }),
    record({ impressions: 500, clicks: 50, installs: 10, activations: 8, payers: 1, spendUsd: 20, revenueD7Usd: 10, revenueD30Usd: 25 })
  ]);

  expect(metrics.cpi).toBe(2);
  expect(metrics.activationRate).toBeCloseTo(0.6);
  expect(metrics.d7Roas).toBeCloseTo(0.5);
  expect(metrics.d30Ltv).toBe(25);
});

it("returns zero for ratios with a zero denominator", () => {
  expect(aggregateMetrics([]).cpi).toBe(0);
});
```

- [ ] **Step 3: Verify the tests fail**

Run: `npm test -- src/domain/metrics.test.ts`

Expected: FAIL because `aggregateMetrics` is missing.

- [ ] **Step 4: Implement pure metric aggregation**

Implement `safeDivide(numerator, denominator)` and `aggregateMetrics(records)`. `d30Ltv` is `revenueD30Usd / payers`; all other derived metrics use aggregate totals rather than averaging row-level ratios.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/domain/metrics.test.ts`

Expected: all metric tests pass.

```bash
git add src/domain
git commit -m "feat: add normalized acquisition metrics"
```

### Task 3: Add Mock Data and the Replaceable Data Provider

**Files:**
- Create: `src/data/DataProvider.ts`
- Create: `src/data/mock/records.ts`
- Create: `src/data/mock/MockDataProvider.ts`
- Create: `public/creative-thumbnails/creator-workflow.webp`
- Create: `public/creative-thumbnails/finance-tracker.webp`
- Create: `public/creative-thumbnails/wellness-routine.webp`

- [ ] **Step 1: Define the provider contract**

```ts
import type { AcquisitionRecord } from "../domain/types";

export interface DataProvider {
  getRecords(): Promise<AcquisitionRecord[]>;
}
```

- [ ] **Step 2: Create deterministic mock records**

Create at least 72 records: six platforms, three Apps, six countries, both operating systems, and dates spanning 30 days. Include:

- one Meta segment with CPI at least 25% above its previous-period value;
- one TikTok segment with D7 ROAS at least 20% below its previous period;
- one Microsoft segment whose budget pace exceeds time pace by 15 percentage points;
- one LinkedIn record with `updatedAt` older than 24 hours;
- at least three creative types and three thumbnail paths.

Use a seeded helper rather than `Math.random()` so tests and screenshots remain stable.

- [ ] **Step 3: Implement the mock provider**

```ts
import type { DataProvider } from "../DataProvider";
import { mockRecords } from "./records";

export class MockDataProvider implements DataProvider {
  async getRecords() {
    return structuredClone(mockRecords);
  }
}
```

- [ ] **Step 4: Add and optimize three real bitmap thumbnails**

Create three 4:3 WebP images showing the actual fictional App ad concepts: creator workflow, finance tracker, and wellness routine. Keep each under 120 KB.

- [ ] **Step 5: Verify and commit**

Run: `npm run lint`

Expected: TypeScript exits successfully.

```bash
git add src/data public/creative-thumbnails
git commit -m "feat: add deterministic acquisition mock data"
```

### Task 4: Implement Filtering and Shared Filter State

**Files:**
- Create: `src/domain/filters.ts`
- Create: `src/domain/filters.test.ts`
- Create: `src/state/FilterContext.tsx`
- Create: `src/state/FilterContext.test.tsx`
- Create: `src/components/filters/GlobalFilters.tsx`

- [ ] **Step 1: Define filter state and failing filter tests**

```ts
export interface FilterState {
  dateFrom: string;
  dateTo: string;
  apps: string[];
  platforms: Platform[];
  accounts: string[];
  countries: string[];
  operatingSystems: Array<"iOS" | "Android">;
}
```

Test that `filterRecords` applies all populated filters with AND semantics and treats empty arrays as “all”.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- src/domain/filters.test.ts`

Expected: FAIL because `filterRecords` is missing.

- [ ] **Step 3: Implement filtering**

Implement date bounds inclusively and array selections with `includes`. Keep the function pure.

- [ ] **Step 4: Test shared reset behavior**

Render a `FilterProvider` test consumer, change `platforms`, call `resetFilters`, and assert the default state is restored.

- [ ] **Step 5: Implement context and filter controls**

`FilterContext` exposes `filters`, `setFilter`, and `resetFilters`. `GlobalFilters` renders native select/menu controls for date, App, Platform, Account, Country, and OS plus a reset icon button with tooltip.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- src/domain/filters.test.ts src/state/FilterContext.test.tsx`

Expected: all filter tests pass.

```bash
git add src/domain/filters* src/state src/components/filters
git commit -m "feat: add global acquisition filters"
```

### Task 5: Build the Visual System, Navigation, and Shared Components

**Files:**
- Create: `src/app/styles.css`
- Create: `src/app/routes.tsx`
- Create: `src/components/layout/AppShell.tsx`
- Create: `src/components/metrics/KpiStrip.tsx`
- Create: `src/components/charts/Chart.tsx`
- Create: `src/components/data/DataTable.tsx`
- Create: `src/components/feedback/ModuleState.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Write the navigation test**

Extend `App.test.tsx` to assert navigation labels `总览`, `投放分析`, and `素材分析`, and verify the default route shows `管理总览`.

- [ ] **Step 2: Verify the test fails**

Run: `npm test -- src/app/App.test.tsx`

Expected: FAIL because navigation and routes are absent.

- [ ] **Step 3: Implement the report-style design tokens**

Define CSS custom properties for:

```css
:root {
  --canvas: #f7f7f4;
  --surface: #ffffff;
  --ink: #171717;
  --muted: #686b66;
  --line: #cfd0ca;
  --mint: #d9ece5;
  --peach: #f3dfc9;
  --lilac: #e5e0f2;
  --positive: #0f6b58;
  --negative: #a33c2f;
  --warning: #9a650e;
  --radius: 6px;
}
```

Use zero letter spacing, compact typography, 44px minimum interactive height on touch layouts, and card radii no larger than 6px.

- [ ] **Step 4: Implement reusable primitives**

- `Chart`: owns ECharts lifecycle and resize cleanup.
- `KpiStrip`: stable responsive grid with value, comparison, and semantic status.
- `DataTable`: accessible sortable headers and horizontal overflow.
- `ModuleState`: loading, error, empty, delayed, and partial-data variants.
- `AppShell`: sidebar navigation, header, filter area, and `<Outlet />`.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/app/App.test.tsx && npm run lint`

Expected: tests and TypeScript pass.

```bash
git add src/app src/main.tsx src/components
git commit -m "feat: add report-style dashboard shell"
```

### Task 6: Implement Anomaly Detection

**Files:**
- Create: `src/domain/anomalies.ts`
- Create: `src/domain/anomalies.test.ts`

- [ ] **Step 1: Write failing anomaly tests**

Test these exact thresholds:

```ts
expect(detectMetricChange("cpi", 2.4, 2)).toMatchObject({ severity: "high" });
expect(detectMetricChange("d7Roas", 0.34, 0.4)).toMatchObject({ severity: "high" });
expect(detectBudgetPace(0.65, 0.5)).toBeTruthy();
expect(detectDataDelay("2026-06-04T00:00:00Z", new Date("2026-06-06T00:00:01Z"))).toBeTruthy();
```

Also test boundary values below the threshold return no anomaly.

- [ ] **Step 2: Verify failure**

Run: `npm test -- src/domain/anomalies.test.ts`

Expected: FAIL because anomaly functions are missing.

- [ ] **Step 3: Implement centralized rules**

Export `ANOMALY_THRESHOLDS`:

```ts
export const ANOMALY_THRESHOLDS = {
  cpiIncrease: 0.2,
  d7RoasDecrease: 0.15,
  budgetPaceGap: 0.1,
  dataDelayHours: 24
} as const;
```

Return anomalies with `id`, `kind`, `severity`, `scope`, `currentValue`, `comparisonValue`, and `message`.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- src/domain/anomalies.test.ts`

Expected: all anomaly tests pass.

```bash
git add src/domain/anomalies*
git commit -m "feat: add acquisition anomaly rules"
```

### Task 7: Build the Management Dashboard

**Files:**
- Create: `src/features/dashboard/DashboardPage.tsx`
- Modify: `src/app/routes.tsx`
- Modify: `src/app/App.test.tsx`

- [ ] **Step 1: Add a failing dashboard content test**

Render the dashboard with mock data and assert:

```tsx
expect(await screen.findByText("总花费 Spend")).toBeInTheDocument();
expect(screen.getByText("预算节奏")).toBeInTheDocument();
expect(screen.getByText("异常提醒")).toBeInTheDocument();
expect(screen.getByText("平台表现")).toBeInTheDocument();
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- src/app/App.test.tsx`

Expected: FAIL because dashboard modules are missing.

- [ ] **Step 3: Implement dashboard view models**

Inside focused helpers in `DashboardPage.tsx`, derive:

- seven KPIs and previous-period comparisons;
- daily Spend, Installs, and D7 ROAS series;
- platform summary rows;
- country ranking rows;
- budget pace;
- anomaly list.

Do not calculate ratios from displayed rounded values.

- [ ] **Step 4: Compose the dashboard**

Order modules:

1. title, update time, and USD badge;
2. seven KPI strip;
3. Spend/Installs trend and budget pace;
4. D7 ROAS trend and platform mix;
5. country ranking and geographic distribution;
6. anomaly list;
7. sortable platform/Campaign summary.

Chart and table selections update `FilterContext` or navigate to `/performance` with the selected dimension.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/app/App.test.tsx && npm run build`

Expected: tests pass and Vite produces `dist/`.

```bash
git add src/features/dashboard src/app
git commit -m "feat: build acquisition management dashboard"
```

### Task 8: Build Performance Drill-Down

**Files:**
- Create: `src/features/performance/PerformanceAnalysisPage.tsx`
- Modify: `src/app/routes.tsx`
- Modify: `src/app/App.test.tsx`

- [ ] **Step 1: Write a failing drill-down test**

Navigate to `/performance`, click the `Meta Ads` row, and assert the breadcrumb contains `Platform / Meta Ads` and the next dimension label is `Account`.

- [ ] **Step 2: Verify failure**

Run: `npm test -- src/app/App.test.tsx`

Expected: FAIL because drill-down is absent.

- [ ] **Step 3: Implement the drill path**

Use this fixed order:

```ts
const drillDimensions = [
  "platform",
  "account",
  "country",
  "os",
  "campaign",
  "adGroup",
  "creative"
] as const;
```

Store selected dimension/value pairs in page state. Breadcrumb selection truncates the path. Filtering the current dataset is derived from global filters plus the drill path.

- [ ] **Step 4: Build the analysis modules**

Render:

- breadcrumb;
- dimension segmented control;
- acquisition funnel;
- selected-segment trend;
- contribution ranking;
- searchable and sortable drill table.

Clicking a chart category or table row advances to the next dimension.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/app/App.test.tsx && npm run build`

Expected: drill test and production build pass.

```bash
git add src/features/performance src/app
git commit -m "feat: add performance drill-down analysis"
```

### Task 9: Build Creative Analysis

**Files:**
- Create: `src/features/creatives/CreativeAnalysisPage.tsx`
- Modify: `src/app/routes.tsx`
- Modify: `src/app/App.test.tsx`

- [ ] **Step 1: Write a failing creative test**

Navigate to `/creatives` and assert the page shows `素材分析`, a `Video` type filter, and at least one image with alt text containing a creative name.

- [ ] **Step 2: Verify failure**

Run: `npm test -- src/app/App.test.tsx`

Expected: FAIL because creative analysis is absent.

- [ ] **Step 3: Implement creative view models and status**

Group records by creative. Compute Spend, CTR, CPI, Activation Rate, and D7 ROAS. Assign:

- `优秀`: D7 ROAS at least 0.5 and CPI no more than 2.5;
- `观察`: neither excellent nor poor;
- `较差`: D7 ROAS below 0.3 or CPI above 3.5.

- [ ] **Step 4: Build the creative interface**

Render platform, creative type, and status filters; search; sort menu; responsive creative rows with thumbnails; and a selected-creative trend panel. Use actual `<img>` elements with explicit dimensions and meaningful alt text.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/app/App.test.tsx && npm run build`

Expected: creative tests and build pass.

```bash
git add src/features/creatives src/app
git commit -m "feat: add creative performance analysis"
```

### Task 10: Add Responsive and End-to-End Verification

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/dashboard.spec.ts`
- Modify: `src/app/styles.css`

- [ ] **Step 1: Configure three Playwright projects**

Use:

- Desktop: `1440x1000`
- Tablet: `834x1112`
- Mobile: `390x844`

Set `webServer.command` to `npm run dev -- --host 127.0.0.1` and reuse an existing server outside CI.

- [ ] **Step 2: Write the failing end-to-end test**

For each project:

- open `/`;
- assert seven KPI labels are visible on desktop/tablet and the mobile core subset is visible;
- navigate to performance and drill into one platform;
- navigate to creatives and verify a thumbnail loads;
- assert no horizontal document overflow, excluding `.data-table-scroll`.

- [ ] **Step 3: Run and verify failure**

Run: `npm run e2e`

Expected: at least one responsive or navigation assertion fails before final CSS.

- [ ] **Step 4: Implement responsive behavior**

At `max-width: 1024px`, reduce chart grids and collapse filters. At `max-width: 640px`, hide secondary KPI cards, stack chart regions, keep anomalies and platform ranking, and allow tables to scroll inside their own container.

- [ ] **Step 5: Run complete verification**

Run:

```bash
npm test
npm run lint
npm run build
npm run e2e
```

Expected: all commands exit 0.

- [ ] **Step 6: Perform visual browser checks**

Open the app in the in-app browser at desktop and mobile sizes. Capture screenshots and verify:

- charts contain rendered pixels;
- headings and controls do not overlap;
- no KPI value changes card dimensions;
- creative thumbnails are visible and correctly framed;
- navigation and filters remain usable.

- [ ] **Step 7: Commit**

```bash
git add playwright.config.ts tests src/app/styles.css
git commit -m "test: verify responsive BI workflows"
```

### Task 11: Final Documentation and Local Handoff

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write local usage documentation**

Document:

```bash
npm install
npm run dev
npm test
npm run build
npm run e2e
```

Explain the three routes, mock-data location, `DataProvider` replacement point, anomaly threshold file, and that all monetary values are USD.

- [ ] **Step 2: Verify documentation commands**

Run: `npm run build && npm test`

Expected: both commands exit 0.

- [ ] **Step 3: Check repository state**

Run: `git status --short`

Expected: only `README.md` is uncommitted.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add local BI dashboard guide"
```

## Final Acceptance Checklist

- [ ] Six overseas advertising platforms appear in stable mock data.
- [ ] All monetary values display in USD.
- [ ] Dashboard shows the seven agreed KPIs.
- [ ] Global filters update all modules.
- [ ] Performance analysis drills from Platform through Creative.
- [ ] Creative analysis uses visible bitmap thumbnails.
- [ ] CPI, ROAS, budget pace, and data delay anomalies use centralized thresholds.
- [ ] Loading, error, empty, no-result, delayed, and partial-data states exist.
- [ ] Desktop, tablet, and mobile Playwright projects pass.
- [ ] Browser screenshots show nonblank charts and no incoherent overlap.
- [ ] `npm test`, `npm run lint`, `npm run build`, and `npm run e2e` all pass.
