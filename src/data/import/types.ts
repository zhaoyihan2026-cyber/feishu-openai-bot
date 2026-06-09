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
