import { IndexedDbImportedDatasetRepository } from "./IndexedDbImportedDatasetRepository";
import { InMemoryImportedDatasetRepository } from "./InMemoryImportedDatasetRepository";
import type { ImportedDatasetRepository } from "./types";

export function createBrowserImportedDatasetRepository(): ImportedDatasetRepository {
  return "indexedDB" in globalThis
    ? new IndexedDbImportedDatasetRepository()
    : new InMemoryImportedDatasetRepository();
}

export const browserImportedDatasetRepository =
  createBrowserImportedDatasetRepository();
