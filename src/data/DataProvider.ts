import type { AcquisitionRecord } from "../domain/types";

export interface DataSourceMetadata {
  type: "mock" | "imported";
  label: string;
  recordCount: number;
  timestamp: string;
}

export interface DataProvider {
  getRecords(): Promise<AcquisitionRecord[]>;
  getMetadata?(): Promise<DataSourceMetadata>;
}
