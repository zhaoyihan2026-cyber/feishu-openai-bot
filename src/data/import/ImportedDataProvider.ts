import type { DataProvider } from "../DataProvider";
import type { AcquisitionRecord } from "../../domain/types";
import type {
  ImportedDatasetRepository,
  ImportedDatasetVersion,
} from "./types";

export class NoImportedDatasetError extends Error {
  constructor() {
    super("No imported dataset is active");
    this.name = "NoImportedDatasetError";
  }
}

export class ImportedDataProvider implements DataProvider {
  constructor(private readonly repository: ImportedDatasetRepository) {}

  async getRecords(): Promise<AcquisitionRecord[]> {
    const version = await this.getCurrentVersion();
    return structuredClone(version.records);
  }

  async getCurrentVersion(): Promise<ImportedDatasetVersion> {
    const state = await this.repository.loadState();
    const version = state.versions.find(({ id }) => id === state.currentVersionId);
    if (!version) {
      throw new NoImportedDatasetError();
    }

    return version;
  }
}
