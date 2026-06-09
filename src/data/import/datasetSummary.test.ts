import { describe, expect, it } from "vitest";
import { mockRecords } from "../mock/records";
import { buildDatasetSummary } from "./datasetSummary";
import type { ImportIssue } from "./types";

describe("buildDatasetSummary", () => {
  it("summarizes records, date ranges, platforms, and import quality", () => {
    const records = [
      { ...mockRecords[0], date: "2026-06-09", platform: "Meta Ads" as const },
      {
        ...mockRecords[1],
        date: "2026-06-01",
        platform: "Google Ads" as const,
      },
    ];
    const issues: ImportIssue[] = [
      { rowNumber: 2, severity: "error", message: "bad row" },
      { rowNumber: 3, severity: "warning", message: "fallback" },
    ];

    expect(buildDatasetSummary(records, issues, 3)).toEqual({
      recordCount: 2,
      dateRange: { start: "2026-06-01", end: "2026-06-09" },
      platforms: ["Google Ads", "Meta Ads"],
      quality: {
        totalRows: 3,
        validRows: 2,
        errorRows: 1,
        warnings: 1,
      },
    });
  });

  it("returns an empty date range when no records are valid", () => {
    expect(buildDatasetSummary([], [], 0)).toEqual({
      recordCount: 0,
      dateRange: null,
      platforms: [],
      quality: {
        totalRows: 0,
        validRows: 0,
        errorRows: 0,
        warnings: 0,
      },
    });
  });
});
