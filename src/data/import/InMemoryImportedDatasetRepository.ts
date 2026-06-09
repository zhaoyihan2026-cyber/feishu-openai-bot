import type {
  ImportedDatasetRepository,
  ImportedDatasetState,
  ImportedDatasetVersion,
} from "./types";

function cloneState(state: ImportedDatasetState): ImportedDatasetState {
  return structuredClone(state);
}

export class InMemoryImportedDatasetRepository
  implements ImportedDatasetRepository
{
  private state: ImportedDatasetState = {
    currentVersionId: null,
    versions: [],
  };

  async loadState(): Promise<ImportedDatasetState> {
    return cloneState(this.state);
  }

  async saveVersion(version: ImportedDatasetVersion): Promise<void> {
    this.state = {
      currentVersionId: version.id,
      versions: [
        ...this.state.versions.filter(({ id }) => id !== version.id),
        structuredClone(version),
      ],
    };
  }

  async setCurrentVersion(versionId: string | null): Promise<void> {
    this.state = {
      ...this.state,
      currentVersionId: versionId,
    };
  }

  async deleteVersion(versionId: string): Promise<void> {
    this.state = {
      currentVersionId:
        this.state.currentVersionId === versionId
          ? null
          : this.state.currentVersionId,
      versions: this.state.versions.filter(({ id }) => id !== versionId),
    };
  }

  async clear(): Promise<void> {
    this.state = {
      currentVersionId: null,
      versions: [],
    };
  }
}
