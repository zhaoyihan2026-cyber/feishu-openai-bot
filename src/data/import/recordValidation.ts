import type { AcquisitionRecord } from "../../domain/types";
import {
  normalizeCreativeType,
  normalizeOs,
  normalizePlatform,
  REQUIRED_IMPORT_FIELDS,
} from "./fieldMapping";
import type {
  ImportField,
  ImportIssue,
  ImportQualitySummary,
  RawImportRow,
} from "./types";
import {
  parseDateValue,
  parseNumberValue,
  parsePercentValue,
} from "./valueParsing";

export interface ValidateImportRowsOptions {
  importedAt: string;
  sourceName?: string;
}

export interface ValidateImportRowsResult {
  records: AcquisitionRecord[];
  issues: ImportIssue[];
  quality: ImportQualitySummary;
}

const NUMBER_FIELDS: Array<{
  field: ImportField;
  required: boolean;
  defaultValue: number;
}> = [
  { field: "impressions", required: true, defaultValue: 0 },
  { field: "clicks", required: true, defaultValue: 0 },
  { field: "installs", required: true, defaultValue: 0 },
  { field: "activations", required: false, defaultValue: 0 },
  { field: "payers", required: false, defaultValue: 0 },
  { field: "spendUsd", required: true, defaultValue: 0 },
  { field: "revenueD7Usd", required: false, defaultValue: 0 },
  { field: "revenueD30Usd", required: false, defaultValue: 0 },
];

const REPORT_NUMBER_FIELDS: ImportField[] = [
  "arppu",
  "cpm",
  "cpc",
  "ipm",
  "cpi",
  "cpr",
  "cpp",
];

const REPORT_PERCENT_FIELDS: ImportField[] = [
  "d0Roas",
  "paymentRate",
  "installRate",
  "ctr",
  "cvr",
  "installRegistrationRate",
  "d1RetentionRate",
  "d7RetentionRate",
];

function rawValue(
  row: RawImportRow,
  mappedFields: Partial<Record<ImportField, string>>,
  field: ImportField,
): unknown {
  const header = mappedFields[field];
  return header ? row[header] : undefined;
}

function fallbackString(
  row: RawImportRow,
  mappedFields: Partial<Record<ImportField, string>>,
  field: ImportField,
  defaultValue: string,
): string {
  const value = rawValue(row, mappedFields, field);
  const text = String(value ?? "").trim();
  return text || defaultValue;
}

function encodedIdPart(value: string): string {
  return encodeURIComponent(value).replace(/%/g, "");
}

function createRecordId(
  date: string,
  platform: AcquisitionRecord["platform"],
  campaign: string,
  rowNumber: number,
): string {
  return [
    "import",
    date,
    encodedIdPart(platform),
    encodedIdPart(campaign),
    String(rowNumber),
  ].join(":");
}

function addIssue(
  issues: ImportIssue[],
  issue: Omit<ImportIssue, "severity"> & { severity?: ImportIssue["severity"] },
): void {
  issues.push({ severity: "error", ...issue });
}

function inferDefaultYear({
  importedAt,
  sourceName,
}: ValidateImportRowsOptions): number | undefined {
  const sourceYear = /(?:^|[^\d])((?:19|20)\d{2})(?:[^\d]|$)/.exec(
    sourceName ?? "",
  )?.[1];
  if (sourceYear) {
    return Number(sourceYear);
  }

  const importedYear = new Date(importedAt).getUTCFullYear();
  return Number.isFinite(importedYear) ? importedYear : undefined;
}

export function validateImportRows(
  rows: RawImportRow[],
  mappedFields: Partial<Record<ImportField, string>>,
  options: ValidateImportRowsOptions,
): ValidateImportRowsResult {
  const records: AcquisitionRecord[] = [];
  const issues: ImportIssue[] = [];
  const defaultYear = inferDefaultYear(options);
  let errorRows = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const rowIssues: ImportIssue[] = [];

    for (const field of REQUIRED_IMPORT_FIELDS) {
      const value = rawValue(row, mappedFields, field);
      if (String(value ?? "").trim() === "") {
        addIssue(rowIssues, {
          rowNumber,
          field,
          message: `${field} 为必填字段`,
          rawValue: value,
        });
      }
    }

    const parsedDate = parseDateValue(rawValue(row, mappedFields, "date"), {
      defaultYear,
    });
    if (!parsedDate.ok) {
      addIssue(rowIssues, {
        rowNumber,
        field: "date",
        message: parsedDate.message,
        rawValue: rawValue(row, mappedFields, "date"),
      });
    }

    const platform = normalizePlatform(rawValue(row, mappedFields, "platform"));
    if (!platform) {
      addIssue(rowIssues, {
        rowNumber,
        field: "platform",
        message: "平台无法识别",
        rawValue: rawValue(row, mappedFields, "platform"),
      });
    }

    const numbers: Partial<Record<ImportField, number>> = {};
    for (const { field, required, defaultValue } of NUMBER_FIELDS) {
      const parsed = parseNumberValue(rawValue(row, mappedFields, field), {
        required,
        defaultValue,
        allowNegative: false,
      });
      if (parsed.ok) {
        numbers[field] = parsed.value;
      } else {
        addIssue(rowIssues, {
          rowNumber,
          field,
          message: parsed.message,
          rawValue: rawValue(row, mappedFields, field),
        });
      }
    }

    const budget = parseNumberValue(rawValue(row, mappedFields, "budgetUsd"), {
      required: false,
      defaultValue: numbers.spendUsd ?? 0,
      allowNegative: false,
    });
    if (budget.ok) {
      numbers.budgetUsd = budget.value;
    } else {
      addIssue(rowIssues, {
        rowNumber,
        field: "budgetUsd",
        message: budget.message,
        rawValue: rawValue(row, mappedFields, "budgetUsd"),
      });
    }

    const reportNumbers: Partial<Record<ImportField, number>> = {};
    for (const field of REPORT_NUMBER_FIELDS) {
      const parsed = parseNumberValue(rawValue(row, mappedFields, field), {
        required: false,
        defaultValue: undefined,
        allowNegative: false,
      });
      if (parsed.ok) {
        if (String(rawValue(row, mappedFields, field) ?? "").trim()) {
          reportNumbers[field] = parsed.value;
        }
      } else {
        addIssue(rowIssues, {
          rowNumber,
          field,
          message: parsed.message,
          rawValue: rawValue(row, mappedFields, field),
        });
      }
    }

    const reportRates: Partial<Record<ImportField, number>> = {};
    for (const field of REPORT_PERCENT_FIELDS) {
      const parsed = parsePercentValue(rawValue(row, mappedFields, field), {
        required: false,
        defaultValue: undefined,
        allowNegative: false,
      });
      if (parsed.ok) {
        if (String(rawValue(row, mappedFields, field) ?? "").trim()) {
          reportRates[field] = parsed.value;
        }
      } else {
        addIssue(rowIssues, {
          rowNumber,
          field,
          message: parsed.message,
          rawValue: rawValue(row, mappedFields, field),
        });
      }
    }

    if (rowIssues.length > 0) {
      errorRows += 1;
      issues.push(...rowIssues);
      return;
    }

    const osValue = rawValue(row, mappedFields, "os");
    const os = normalizeOs(osValue);
    if (String(osValue ?? "").trim() && !os) {
      addIssue(issues, {
        rowNumber,
        field: "os",
        severity: "warning",
        message: "操作系统无法识别，已使用 iOS",
        rawValue: osValue,
      });
    }

    const creativeTypeValue = rawValue(row, mappedFields, "creativeType");
    const creativeType = normalizeCreativeType(creativeTypeValue);
    if (String(creativeTypeValue ?? "").trim() && !creativeType) {
      addIssue(issues, {
        rowNumber,
        field: "creativeType",
        severity: "warning",
        message: "素材类型无法识别，已使用 Image",
        rawValue: creativeTypeValue,
      });
    }

    const campaign = fallbackString(
      row,
      mappedFields,
      "campaign",
      "Unspecified Campaign",
    );
    const date = parsedDate.ok ? parsedDate.value : "";
    const selected = fallbackString(row, mappedFields, "selected", "");

    records.push({
      id: createRecordId(date, platform!, campaign, rowNumber),
      date,
      updatedAt: fallbackString(
        row,
        mappedFields,
        "updatedAt",
        options.importedAt,
      ),
      app: fallbackString(row, mappedFields, "app", "Unknown App"),
      platform: platform!,
      account: fallbackString(row, mappedFields, "account", "Unknown Account"),
      country: fallbackString(row, mappedFields, "country", "Unknown"),
      os: os ?? "iOS",
      campaign,
      adGroup: fallbackString(
        row,
        mappedFields,
        "adGroup",
        "Unspecified Ad Group",
      ),
      creative: fallbackString(
        row,
        mappedFields,
        "creative",
        "Unspecified Creative",
      ),
      creativeType: creativeType ?? "Image",
      thumbnail: fallbackString(row, mappedFields, "thumbnail", ""),
      impressions: numbers.impressions!,
      clicks: numbers.clicks!,
      installs: numbers.installs!,
      activations: numbers.activations!,
      payers: numbers.payers!,
      spendUsd: numbers.spendUsd!,
      revenueD7Usd: numbers.revenueD7Usd!,
      revenueD30Usd: numbers.revenueD30Usd!,
      budgetUsd: numbers.budgetUsd!,
      d0Roas: reportRates.d0Roas,
      arppu: reportNumbers.arppu,
      paymentRate: reportRates.paymentRate,
      installRate: reportRates.installRate,
      ctr: reportRates.ctr,
      cvr: reportRates.cvr,
      installRegistrationRate: reportRates.installRegistrationRate,
      cpm: reportNumbers.cpm,
      cpc: reportNumbers.cpc,
      ipm: reportNumbers.ipm,
      cpi: reportNumbers.cpi,
      cpr: reportNumbers.cpr,
      cpp: reportNumbers.cpp,
      d1RetentionRate: reportRates.d1RetentionRate,
      d7RetentionRate: reportRates.d7RetentionRate,
      selected: selected || undefined,
    });
  });

  return {
    records,
    issues,
    quality: {
      totalRows: rows.length,
      validRows: records.length,
      errorRows,
      warnings: issues.filter(({ severity }) => severity === "warning").length,
    },
  };
}
