import type { DataProvider, DataSourceMetadata } from "../DataProvider";
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

  async getMetadata(): Promise<DataSourceMetadata> {
    try {
      if (this.importedProvider.getMetadata) {
        return await this.importedProvider.getMetadata();
      }

      await this.importedProvider.getRecords();
    } catch (error) {
      if (error instanceof NoImportedDatasetError) {
        return this.fallbackProvider.getMetadata
          ? this.fallbackProvider.getMetadata()
          : {
              type: "mock",
              label: "MockDataProvider",
              recordCount: 0,
              timestamp: new Date(0).toISOString(),
            };
      }

      throw error;
    }

    return {
      type: "imported",
      label: "ImportedDataProvider",
      recordCount: 0,
      timestamp: new Date(0).toISOString(),
    };
  }
}
