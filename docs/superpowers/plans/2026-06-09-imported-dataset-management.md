# Imported Dataset Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CSV/XLSX import, automatic field recognition, local dataset versioning, rollback, and mock fallback to the existing App acquisition BI.

**Architecture:** Keep BI pages behind the existing `DataProvider` boundary. Add a focused import pipeline that parses raw files into normalized `AcquisitionRecord[]`, an IndexedDB-backed repository for dataset versions, and a new Data Management route for import and version actions. Use a composite provider so the app prefers the current imported version and falls back to `MockDataProvider`.

**Tech Stack:** React 19, React Router 7, TypeScript, Vite, Vitest, Testing Library, native IndexedDB, `papaparse` for CSV, `xlsx` for Excel.

---

## File Structure

- Modify: `package.json`
  - Add `papaparse`, `xlsx`, and `@types/papaparse`.
- Modify: `package-lock.json`
  - Regenerate with `npm install`.
- Create: `src/data/import/types.ts`
  - Shared import result, mapping, validation, dataset, and repository types.
- Create: `src/data/import/fieldMapping.ts`
  - Header normalization, field aliases, and platform/OS/creative type normalization.
- Test: `src/data/import/fieldMapping.test.ts`
- Create: `src/data/import/valueParsing.ts`
  - Date and number parsing.
- Test: `src/data/import/valueParsing.test.ts`
- Create: `src/data/import/recordValidation.ts`
  - Convert mapped raw rows into valid `AcquisitionRecord[]` plus errors and warnings.
- Test: `src/data/import/recordValidation.test.ts`
- Create: `src/data/import/fileParsing.ts`
  - Parse CSV and XLSX `File` objects into raw rows.
- Test: `src/data/import/fileParsing.test.ts`
- Create: `src/data/import/datasetSummary.ts`
  - Build version summaries and quality stats.
- Test: `src/data/import/datasetSummary.test.ts`
- Create: `src/data/import/InMemoryImportedDatasetRepository.ts`
  - Test-friendly repository implementing the same interface as browser storage.
- Create: `src/data/import/IndexedDbImportedDatasetRepository.ts`
  - Browser repository for persistent local versions.
- Test: `src/data/import/ImportedDatasetRepository.test.ts`
- Create: `src/data/import/ImportedDataProvider.ts`
  - Provider reading current imported records from a repository.
- Create: `src/data/import/CompositeDataProvider.ts`
  - Provider that falls back to mock data when no imported version is active.
- Test: `src/data/import/DataProviderComposition.test.ts`
- Modify: `src/components/layout/AppShell.tsx`
  - Add data source metadata to outlet context, update data timestamp source, and include a Data Management nav item.
- Test: `src/components/layout/AppShell.test.tsx`
- Create: `src/features/data-management/DataManagementPage.tsx`
  - Current data status, import wizard, version list, rollback/delete/clear controls.
- Test: `src/features/data-management/DataManagementPage.test.tsx`
- Modify: `src/app/routes.tsx`
  - Add `/data` route.
- Modify: `src/app/App.test.tsx`
  - Verify navigation includes Data Management and imported data can drive dashboard pages.
- Modify: `src/app/styles.css`
  - Add restrained operational styles for the Data Management page.

## Task 1: Add Import Dependencies

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install parser dependencies**

Run:

```bash
PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm install papaparse xlsx @types/papaparse
```

Expected: `package.json` contains the new dependencies and `package-lock.json` updates.

- [ ] **Step 2: Verify dependency graph still installs cleanly**

Run:

```bash
rm -rf node_modules
PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm ci
```

Expected: install exits 0. Audit warnings may remain; do not run `npm audit fix --force`.

- [ ] **Step 3: Commit dependency update**

```bash
git add package.json package-lock.json
git commit -m "chore: add import parser dependencies"
```

## Task 2: Field Mapping and Normalization

**Files:**
- Create: `src/data/import/types.ts`
- Create: `src/data/import/fieldMapping.ts`
- Test: `src/data/import/fieldMapping.test.ts`

- [ ] **Step 1: Write failing field mapping tests**

Create `src/data/import/fieldMapping.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  mapHeaders,
  normalizeCreativeType,
  normalizeOs,
  normalizePlatform,
} from "./fieldMapping";

describe("fieldMapping", () => {
  it("maps common English and Chinese column aliases to standard fields", () => {
    const mapping = mapHeaders([
      "Date",
      "Campaign Name",
      "消耗",
      "展示",
      "Clicks",
      "首次安装",
      "D7 Revenue",
    ]);

    expect(mapping.mappedFields).toMatchObject({
      date: "Date",
      campaign: "Campaign Name",
      spendUsd: "消耗",
      impressions: "展示",
      clicks: "Clicks",
      installs: "首次安装",
      revenueD7Usd: "D7 Revenue",
    });
    expect(mapping.missingRequiredFields).toEqual(["platform"]);
  });

  it("normalizes supported platform aliases to the existing enum", () => {
    expect(normalizePlatform("facebook")).toBe("Meta Ads");
    expect(normalizePlatform("adwords")).toBe("Google Ads");
    expect(normalizePlatform("tt")).toBe("TikTok Ads");
    expect(normalizePlatform("bing ads")).toBe("Microsoft Ads");
    expect(normalizePlatform("linkedin")).toBe("LinkedIn Ads");
    expect(normalizePlatform("twitter")).toBe("X Ads");
    expect(normalizePlatform("unknown network")).toBeNull();
  });

  it("normalizes OS and creative type with warning-friendly fallbacks", () => {
    expect(normalizeOs("android")).toBe("Android");
    expect(normalizeOs("ios")).toBe("iOS");
    expect(normalizeOs("desktop")).toBeNull();
    expect(normalizeCreativeType("video")).toBe("Video");
    expect(normalizeCreativeType("playable ad")).toBe("Playable");
    expect(normalizeCreativeType("banner")).toBe("Image");
    expect(normalizeCreativeType("native")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm test -- src/data/import/fieldMapping.test.ts
```

Expected: FAIL because `./fieldMapping` does not exist.

- [ ] **Step 3: Create shared import types**

Create `src/data/import/types.ts`:

```typescript
import type { AcquisitionRecord } from "../../domain/types";

export type ImportField = keyof AcquisitionRecord;

export type RawImportRow = Record<string, unknown>;

export interface HeaderMappingResult {
  mappedFields: Partial<Record<ImportField, string>>;
  unmappedHeaders: string[];
  missingRequiredFields: ImportField[];
}

export type ImportSeverity = "error" | "warning";

export interface ImportIssue {
  rowNumber: number;
  field?: ImportField;
  severity: ImportSeverity;
  message: string;
  rawValue?: unknown;
}

export interface ImportQualitySummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  warnings: number;
}

export type ImportMode = "replace" | "append";

export interface DatasetSummary {
  recordCount: number;
  dateRange: { start: string; end: string } | null;
  platforms: AcquisitionRecord["platform"][];
  quality: ImportQualitySummary;
}

export interface ImportedDatasetVersion {
  id: string;
  name: string;
  createdAt: string;
  mode: ImportMode;
  records: AcquisitionRecord[];
  summary: DatasetSummary;
  issues: ImportIssue[];
}

export interface ImportedDatasetState {
  currentVersionId: string | null;
  versions: ImportedDatasetVersion[];
}

export interface ImportedDatasetRepository {
  loadState(): Promise<ImportedDatasetState>;
  saveVersion(version: ImportedDatasetVersion): Promise<void>;
  setCurrentVersion(versionId: string | null): Promise<void>;
  deleteVersion(versionId: string): Promise<void>;
  clear(): Promise<void>;
}
```

- [ ] **Step 4: Implement minimal mapping code**

Create `src/data/import/fieldMapping.ts` with alias maps for required and optional fields. Include these exported functions:

```typescript
export function mapHeaders(headers: string[]): HeaderMappingResult;
export function normalizePlatform(value: unknown): Platform | null;
export function normalizeOs(value: unknown): AcquisitionRecord["os"] | null;
export function normalizeCreativeType(
  value: unknown,
): AcquisitionRecord["creativeType"] | null;
```

Implementation requirements:

- Normalize headers by trimming, lowercasing, and removing whitespace, `_`, `-`, `.`, `:`, `：`, `(`, `)`, `（`, `）`.
- Required fields are `date`, `platform`, `campaign`, `spendUsd`, `impressions`, `clicks`, and `installs`.
- Preserve the original header string as the mapping value.
- Do not map two headers to the same field; keep the first match.

- [ ] **Step 5: Verify green**

Run:

```bash
PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm test -- src/data/import/fieldMapping.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/import/types.ts src/data/import/fieldMapping.ts src/data/import/fieldMapping.test.ts
git commit -m "feat: add import field mapping"
```

## Task 3: Value Parsing

**Files:**
- Create: `src/data/import/valueParsing.ts`
- Test: `src/data/import/valueParsing.test.ts`

- [ ] **Step 1: Write failing parser tests**

Create `src/data/import/valueParsing.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { parseDateValue, parseNumberValue } from "./valueParsing";

describe("valueParsing", () => {
  it("parses supported date formats and Excel serial dates", () => {
    expect(parseDateValue("2026-06-09")).toEqual({
      ok: true,
      value: "2026-06-09",
    });
    expect(parseDateValue("2026/06/09")).toEqual({
      ok: true,
      value: "2026-06-09",
    });
    expect(parseDateValue(46282)).toEqual({ ok: true, value: "2026-09-21" });
  });

  it("rejects invalid dates", () => {
    expect(parseDateValue("2026-99-99").ok).toBe(false);
    expect(parseDateValue("").ok).toBe(false);
  });

  it("parses currency, commas, and empty optional values", () => {
    expect(parseNumberValue("$1,234.50", { required: true })).toEqual({
      ok: true,
      value: 1234.5,
    });
    expect(parseNumberValue("", { required: false, defaultValue: 0 })).toEqual({
      ok: true,
      value: 0,
    });
  });

  it("rejects invalid and negative required acquisition numbers", () => {
    expect(parseNumberValue("abc", { required: true }).ok).toBe(false);
    expect(parseNumberValue("-1", { required: true, allowNegative: false }).ok)
      .toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm test -- src/data/import/valueParsing.test.ts
```

Expected: FAIL because `./valueParsing` does not exist.

- [ ] **Step 3: Implement value parsers**

Create `src/data/import/valueParsing.ts`:

```typescript
export interface ParseSuccess<Value> {
  ok: true;
  value: Value;
}

export interface ParseFailure {
  ok: false;
  message: string;
}

export type ParseResult<Value> = ParseSuccess<Value> | ParseFailure;

export function parseDateValue(value: unknown): ParseResult<string> {
  // Accept YYYY-MM-DD, YYYY/MM/DD, Date, and Excel serial numbers.
}

export function parseNumberValue(
  value: unknown,
  options: {
    required: boolean;
    defaultValue?: number;
    allowNegative?: boolean;
  },
): ParseResult<number> {
  // Strip $, commas, and whitespace. Reject invalid numbers and disallowed negatives.
}
```

Use UTC date construction for Excel serial conversion so tests are stable across time zones.

- [ ] **Step 4: Verify green**

Run:

```bash
PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm test -- src/data/import/valueParsing.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/import/valueParsing.ts src/data/import/valueParsing.test.ts
git commit -m "feat: parse import values"
```

## Task 4: Record Validation

**Files:**
- Create: `src/data/import/recordValidation.ts`
- Test: `src/data/import/recordValidation.test.ts`

- [ ] **Step 1: Write failing validation tests**

Create `src/data/import/recordValidation.test.ts` with tests for:

```typescript
import { describe, expect, it } from "vitest";
import { validateImportRows } from "./recordValidation";

describe("validateImportRows", () => {
  it("converts valid mapped rows into acquisition records", () => {
    const result = validateImportRows(
      [
        {
          Date: "2026-06-09",
          Platform: "facebook",
          Campaign: "Launch",
          Spend: "$120.50",
          Impressions: "1,000",
          Clicks: "50",
          Installs: "20",
        },
      ],
      {
        date: "Date",
        platform: "Platform",
        campaign: "Campaign",
        spendUsd: "Spend",
        impressions: "Impressions",
        clicks: "Clicks",
        installs: "Installs",
      },
      { importedAt: "2026-06-09T10:00:00.000Z" },
    );

    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      date: "2026-06-09",
      updatedAt: "2026-06-09T10:00:00.000Z",
      platform: "Meta Ads",
      campaign: "Launch",
      spendUsd: 120.5,
      impressions: 1000,
      clicks: 50,
      installs: 20,
      app: "Unknown App",
      budgetUsd: 120.5,
    });
    expect(result.quality).toMatchObject({
      totalRows: 1,
      validRows: 1,
      errorRows: 0,
    });
  });

  it("rejects rows with missing required fields or unknown platforms", () => {
    const result = validateImportRows(
      [
        { Date: "2026-06-09", Platform: "unknown", Campaign: "Bad" },
        { Date: "2026-06-09", Platform: "meta", Campaign: "Missing spend" },
      ],
      {
        date: "Date",
        platform: "Platform",
        campaign: "Campaign",
        spendUsd: "Spend",
        impressions: "Impressions",
        clicks: "Clicks",
        installs: "Installs",
      },
      { importedAt: "2026-06-09T10:00:00.000Z" },
    );

    expect(result.records).toEqual([]);
    expect(result.quality.errorRows).toBe(2);
    expect(result.issues.map(({ severity }) => severity)).toContain("error");
  });

  it("adds warnings for fallback OS and creative type values", () => {
    const result = validateImportRows(
      [
        {
          Date: "2026-06-09",
          Platform: "meta",
          Campaign: "Launch",
          Spend: "10",
          Impressions: "100",
          Clicks: "10",
          Installs: "3",
          OS: "desktop",
          Type: "native",
        },
      ],
      {
        date: "Date",
        platform: "Platform",
        campaign: "Campaign",
        spendUsd: "Spend",
        impressions: "Impressions",
        clicks: "Clicks",
        installs: "Installs",
        os: "OS",
        creativeType: "Type",
      },
      { importedAt: "2026-06-09T10:00:00.000Z" },
    );

    expect(result.records[0]).toMatchObject({ os: "iOS", creativeType: "Image" });
    expect(result.issues.filter(({ severity }) => severity === "warning"))
      .toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm test -- src/data/import/recordValidation.test.ts
```

Expected: FAIL because `./recordValidation` does not exist.

- [ ] **Step 3: Implement validation**

Create `src/data/import/recordValidation.ts` exporting:

```typescript
export interface ValidateImportRowsOptions {
  importedAt: string;
}

export interface ValidateImportRowsResult {
  records: AcquisitionRecord[];
  issues: ImportIssue[];
  quality: ImportQualitySummary;
}

export function validateImportRows(
  rows: RawImportRow[],
  mappedFields: Partial<Record<ImportField, string>>,
  options: ValidateImportRowsOptions,
): ValidateImportRowsResult;
```

Implementation notes:

- Row numbers are 1-based data-row numbers, not including the header.
- Generate deterministic ids as `import:${date}:${platform}:${campaign}:${rowNumber}` with unsafe characters encoded.
- Required field errors reject the whole row.
- Unknown platform rejects the row.
- Invalid required numeric/date fields reject the row.
- Optional defaults follow the spec exactly.

- [ ] **Step 4: Verify green**

Run:

```bash
PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm test -- src/data/import/recordValidation.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/import/recordValidation.ts src/data/import/recordValidation.test.ts
git commit -m "feat: validate imported records"
```

## Task 5: File Parsing

**Files:**
- Create: `src/data/import/fileParsing.ts`
- Test: `src/data/import/fileParsing.test.ts`

- [ ] **Step 1: Write failing file parsing tests**

Create `src/data/import/fileParsing.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseImportFile } from "./fileParsing";

describe("parseImportFile", () => {
  it("parses CSV files into raw rows", async () => {
    const file = new File(
      ["Date,Platform,Spend\n2026-06-09,Meta,10\n"],
      "sample.csv",
      { type: "text/csv" },
    );

    const result = await parseImportFile(file);

    expect(result).toEqual({
      rows: [{ Date: "2026-06-09", Platform: "Meta", Spend: "10" }],
      headers: ["Date", "Platform", "Spend"],
    });
  });

  it("parses the first worksheet in xlsx files into raw rows", async () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["Date", "Platform", "Spend"],
      ["2026-06-09", "Meta", 10],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Import");
    const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const file = new File([bytes], "sample.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const result = await parseImportFile(file);

    expect(result.headers).toEqual(["Date", "Platform", "Spend"]);
    expect(result.rows).toEqual([
      { Date: "2026-06-09", Platform: "Meta", Spend: 10 },
    ]);
  });

  it("rejects unsupported files", async () => {
    const file = new File(["{}"], "sample.json", { type: "application/json" });

    await expect(parseImportFile(file)).rejects.toThrow(
      "仅支持 CSV 和 .xlsx 文件",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm test -- src/data/import/fileParsing.test.ts
```

Expected: FAIL because `./fileParsing` does not exist.

- [ ] **Step 3: Implement parser**

Create `src/data/import/fileParsing.ts`:

```typescript
export interface ParsedImportFile {
  headers: string[];
  rows: RawImportRow[];
}

export async function parseImportFile(file: File): Promise<ParsedImportFile>;
```

Implementation notes:

- Use `Papa.parse` with `header: true`, `skipEmptyLines: true`.
- Use `XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false })`.
- Convert the first worksheet with `XLSX.utils.sheet_to_json(sheet, { defval: "" })`.
- Headers come from the keys of the first row or the CSV metadata fields.

- [ ] **Step 4: Verify green**

Run:

```bash
PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm test -- src/data/import/fileParsing.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/import/fileParsing.ts src/data/import/fileParsing.test.ts
git commit -m "feat: parse import files"
```

## Task 6: Dataset Summaries and Repository

**Files:**
- Create: `src/data/import/datasetSummary.ts`
- Create: `src/data/import/InMemoryImportedDatasetRepository.ts`
- Create: `src/data/import/IndexedDbImportedDatasetRepository.ts`
- Test: `src/data/import/datasetSummary.test.ts`
- Test: `src/data/import/ImportedDatasetRepository.test.ts`

- [ ] **Step 1: Write failing summary and repository tests**

Create tests that assert:

```typescript
expect(buildDatasetSummary(records, issues)).toMatchObject({
  recordCount: 2,
  dateRange: { start: "2026-06-01", end: "2026-06-09" },
  platforms: ["Meta Ads", "Google Ads"],
  quality: { totalRows: 3, validRows: 2, errorRows: 1, warnings: 1 },
});
```

and repository behavior:

```typescript
const repository = new InMemoryImportedDatasetRepository();
await repository.saveVersion(versionA);
await repository.saveVersion(versionB);
await repository.setCurrentVersion(versionB.id);
expect(await repository.loadState()).toMatchObject({
  currentVersionId: versionB.id,
  versions: [versionA, versionB],
});
await repository.deleteVersion(versionB.id);
expect((await repository.loadState()).currentVersionId).toBeNull();
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm test -- src/data/import/datasetSummary.test.ts src/data/import/ImportedDatasetRepository.test.ts
```

Expected: FAIL because files do not exist.

- [ ] **Step 3: Implement summary and repositories**

Implementation requirements:

- `buildDatasetSummary(records, issues, totalRows)` returns sorted platform names.
- `InMemoryImportedDatasetRepository` clones state on read/write to prevent mutation leaks.
- `IndexedDbImportedDatasetRepository` uses database name `app-acquisition-bi`, version `1`, and object store `dataset-state` with key `singleton`.
- `deleteVersion(currentVersionId)` clears `currentVersionId`.
- `clear()` removes all versions and current selection.

- [ ] **Step 4: Verify green**

Run:

```bash
PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm test -- src/data/import/datasetSummary.test.ts src/data/import/ImportedDatasetRepository.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/import/datasetSummary.ts src/data/import/InMemoryImportedDatasetRepository.ts src/data/import/IndexedDbImportedDatasetRepository.ts src/data/import/datasetSummary.test.ts src/data/import/ImportedDatasetRepository.test.ts
git commit -m "feat: store imported dataset versions"
```

## Task 7: Provider Composition

**Files:**
- Create: `src/data/import/ImportedDataProvider.ts`
- Create: `src/data/import/CompositeDataProvider.ts`
- Test: `src/data/import/DataProviderComposition.test.ts`

- [ ] **Step 1: Write failing provider tests**

Create `src/data/import/DataProviderComposition.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";
import { mockRecords } from "../mock/records";
import { CompositeDataProvider } from "./CompositeDataProvider";
import { ImportedDataProvider } from "./ImportedDataProvider";
import { InMemoryImportedDatasetRepository } from "./InMemoryImportedDatasetRepository";

describe("imported data providers", () => {
  it("returns current imported version records", async () => {
    const repository = new InMemoryImportedDatasetRepository();
    const version = makeVersion("version-a", [mockRecords[0]]);
    await repository.saveVersion(version);
    await repository.setCurrentVersion(version.id);

    await expect(new ImportedDataProvider(repository).getRecords()).resolves
      .toEqual([mockRecords[0]]);
  });

  it("falls back to mock records when no imported version is current", async () => {
    const repository = new InMemoryImportedDatasetRepository();
    const mockProvider = { getRecords: vi.fn(() => Promise.resolve([mockRecords[1]])) };
    const provider = new CompositeDataProvider(
      new ImportedDataProvider(repository),
      mockProvider,
    );

    await expect(provider.getRecords()).resolves.toEqual([mockRecords[1]]);
    expect(mockProvider.getRecords).toHaveBeenCalledTimes(1);
  });
});
```

Include a local `makeVersion` helper in the test file.

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm test -- src/data/import/DataProviderComposition.test.ts
```

Expected: FAIL because providers do not exist.

- [ ] **Step 3: Implement providers**

Provider behavior:

- `ImportedDataProvider.getRecords()` returns current version records.
- If no current version or current id cannot be found, throw `NoImportedDatasetError`.
- `CompositeDataProvider.getRecords()` catches only `NoImportedDatasetError` and calls fallback provider.
- Other repository errors bubble to `AppShell` as loading errors.

- [ ] **Step 4: Verify green**

Run:

```bash
PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm test -- src/data/import/DataProviderComposition.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/import/ImportedDataProvider.ts src/data/import/CompositeDataProvider.ts src/data/import/DataProviderComposition.test.ts
git commit -m "feat: prefer imported acquisition data"
```

## Task 8: Data Management Page

**Files:**
- Create: `src/features/data-management/DataManagementPage.tsx`
- Test: `src/features/data-management/DataManagementPage.test.tsx`

- [ ] **Step 1: Write failing UI tests**

Test these user flows:

- Mock state renders “当前使用模拟数据”.
- Uploading a valid CSV shows field mapping and preview.
- Confirming replace import creates a current version.
- Append import creates a new version without mutating the previous one.
- Selecting an older version makes it current.
- Clearing imported data restores mock state.

Use a `DataManagementPage` prop for an injected `ImportedDatasetRepository` so tests can use `InMemoryImportedDatasetRepository`.

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm test -- src/features/data-management/DataManagementPage.test.tsx
```

Expected: FAIL because page does not exist.

- [ ] **Step 3: Implement page**

Implementation requirements:

- Use visible `<input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">`.
- Use buttons for `覆盖导入`, `追加导入`, `设为当前版本`, `删除版本`, and `清空本地导入数据`.
- Show first 20 valid records in a compact table.
- Show `missingRequiredFields`, `unmappedHeaders`, errors, and warnings before confirmation.
- Disable confirmation when there are zero valid rows.
- Generate version names as `${file.name} ${formattedImportTime}`.

- [ ] **Step 4: Verify green**

Run:

```bash
PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm test -- src/features/data-management/DataManagementPage.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/data-management/DataManagementPage.tsx src/features/data-management/DataManagementPage.test.tsx
git commit -m "feat: add data management page"
```

## Task 9: Wire App Route and Data Source

**Files:**
- Modify: `src/app/routes.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/components/layout/AppShell.tsx`
- Test: `src/components/layout/AppShell.test.tsx`
- Test: `src/app/App.test.tsx`

- [ ] **Step 1: Write failing integration tests**

Add tests that assert:

- Main navigation includes `数据管理`.
- `/data` renders the Data Management page.
- `AppShell` outlet context exposes data source metadata with `type: "mock"` when fallback is active.
- Header timestamp uses imported version creation time when imported data is active.

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm test -- src/components/layout/AppShell.test.tsx src/app/App.test.tsx
```

Expected: FAIL because route/nav/metadata are missing.

- [ ] **Step 3: Wire repositories and routes**

Implementation notes:

- Create a singleton `browserImportedDatasetRepository = new IndexedDbImportedDatasetRepository()`.
- Create `defaultDataProvider = new CompositeDataProvider(new ImportedDataProvider(browserImportedDatasetRepository), new MockDataProvider())`.
- Add `data` route to `AppRoutes`.
- Pass the same repository to `DataManagementPage`.
- Extend `AppDataContext` with:

```typescript
dataSource: {
  type: "mock" | "imported";
  label: string;
  recordCount: number;
  timestamp: string;
};
```

- Keep existing `mockAsOfTimestamp` until all existing pages/tests are adjusted; set it to the active data source timestamp for imported data.

- [ ] **Step 4: Verify green**

Run:

```bash
PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm test -- src/components/layout/AppShell.test.tsx src/app/App.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/routes.tsx src/app/App.tsx src/components/layout/AppShell.tsx src/components/layout/AppShell.test.tsx src/app/App.test.tsx
git commit -m "feat: wire imported data source"
```

## Task 10: Styles and End-to-End Verification

**Files:**
- Modify: `src/app/styles.css`

- [ ] **Step 1: Add data management styles**

Add styles for:

- `.data-management-page`
- `.data-source-status`
- `.import-panel`
- `.import-dropzone`
- `.import-summary-grid`
- `.import-preview`
- `.version-list`
- `.version-row`
- `.issue-list`

Follow existing operational dashboard style: compact modules, 8px or smaller radius, no nested cards, no decorative blobs or landing-page hero.

- [ ] **Step 2: Run full automated verification**

Run:

```bash
PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm test
PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm run build
```

Expected:

- Vitest exits 0.
- Build exits 0.

- [ ] **Step 3: Browser verification**

Start the dev server:

```bash
PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm run dev -- --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173/data` in the in-app browser and verify:

- Page renders without console errors.
- Uploading a small CSV shows mapping and preview.
- Confirming import creates a current version.
- Navigating to `/` shows dashboard data from the imported version.
- Clearing imported data returns to mock state.

- [ ] **Step 4: Commit**

```bash
git add src/app/styles.css
git commit -m "style: polish data management page"
```

## Final Verification

- [ ] Run:

```bash
PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm test
PATH=/Users/zhaoyihan/Documents/大力拼图游戏/tools/node-v24.15.0-darwin-arm64/bin:$PATH npm run build
```

- [ ] Confirm the app is available at `http://127.0.0.1:5173/`.
- [ ] Report any remaining `npm audit` warnings without forcing upgrades.
