import type { AcquisitionRecord } from "../domain/types";

export interface DataProvider {
  getRecords(): Promise<AcquisitionRecord[]>;
}
