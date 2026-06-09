import type { AcquisitionRecord } from "../../domain/types";
import type { DatasetSummary, ImportIssue } from "./types";

export function buildDatasetSummary(
  records: AcquisitionRecord[],
  issues: ImportIssue[],
  totalRows: number,
): DatasetSummary {
  const dates = records.map(({ date }) => date).sort();
  const platforms = Array.from(
    new Set(records.map(({ platform }) => platform)),
  ).sort((left, right) => left.localeCompare(right));

  return {
    recordCount: records.length,
    dateRange:
      dates.length > 0
        ? { start: dates[0], end: dates[dates.length - 1] }
        : null,
    platforms,
    quality: {
      totalRows,
      validRows: records.length,
      errorRows: new Set(
        issues
          .filter(({ severity }) => severity === "error")
          .map(({ rowNumber }) => rowNumber),
      ).size,
      warnings: issues.filter(({ severity }) => severity === "warning").length,
    },
  };
}
