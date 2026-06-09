import { describe, expect, it, vi } from "vitest";
import { mockRecords } from "../mock/records";
import { CompositeDataProvider } from "./CompositeDataProvider";
import { buildDatasetSummary } from "./datasetSummary";
import { ImportedDataProvider } from "./ImportedDataProvider";
import { InMemoryImportedDatasetRepository } from "./InMemoryImportedDatasetRepository";
import type { ImportedDatasetVersion } from "./types";

function makeVersion(
  id: string,
  records = [mockRecords[0]],
): ImportedDatasetVersion {
  return {
    id,
    name: id,
    createdAt: "2026-06-09T10:00:00.000Z",
    mode: "replace",
    records,
    summary: buildDatasetSummary(records, [], records.length),
    issues: [],
  };
}

describe("imported data providers", () => {
  it("returns current imported version records", async () => {
    const repository = new InMemoryImportedDatasetRepository();
    const version = makeVersion("version-a", [mockRecords[0]]);
    await repository.saveVersion(version);
    await repository.setCurrentVersion(version.id);

    await expect(new ImportedDataProvider(repository).getRecords()).resolves
      .toEqual([mockRecords[0]]);
  });

  it("falls back to mock records when no imported version is current", async () => {
    const repository = new InMemoryImportedDatasetRepository();
    const mockProvider = {
      getRecords: vi.fn(() => Promise.resolve([mockRecords[1]])),
    };
    const provider = new CompositeDataProvider(
      new ImportedDataProvider(repository),
      mockProvider,
    );

    await expect(provider.getRecords()).resolves.toEqual([mockRecords[1]]);
    expect(mockProvider.getRecords).toHaveBeenCalledTimes(1);
  });

  it("does not hide unexpected imported provider errors", async () => {
    const provider = new CompositeDataProvider(
      { getRecords: () => Promise.reject(new Error("IndexedDB failed")) },
      { getRecords: () => Promise.resolve([mockRecords[1]]) },
    );

    await expect(provider.getRecords()).rejects.toThrow("IndexedDB failed");
  });
});
