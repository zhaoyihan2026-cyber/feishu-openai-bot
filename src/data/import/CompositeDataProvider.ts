import type { DataProvider } from "../DataProvider";
import type { AcquisitionRecord } from "../../domain/types";
import { NoImportedDatasetError } from "./ImportedDataProvider";

export class CompositeDataProvider implements DataProvider {
  constructor(
    private readonly importedProvider: DataProvider,
    private readonly fallbackProvider: DataProvider,
  ) {}

  async getRecords(): Promise<AcquisitionRecord[]> {
    try {
      return await this.importedProvider.getRecords();
    } catch (error) {
      if (error instanceof NoImportedDatasetError) {
        return this.fallbackProvider.getRecords();
      }

      throw error;
    }
  }
}
