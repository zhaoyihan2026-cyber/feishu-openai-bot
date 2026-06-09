import { describe, expect, it } from "vitest";
import { mockRecords } from "../mock/records";
import { buildDatasetSummary } from "./datasetSummary";
import { InMemoryImportedDatasetRepository } from "./InMemoryImportedDatasetRepository";
import type { ImportedDatasetVersion } from "./types";

function makeVersion(id: string): ImportedDatasetVersion {
  const records = [{ ...mockRecords[0], id: `${id}-record` }];
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

describe("InMemoryImportedDatasetRepository", () => {
  it("saves versions and switches the current version", async () => {
    const repository = new InMemoryImportedDatasetRepository();
    const versionA = makeVersion("version-a");
    const versionB = makeVersion("version-b");

    await repository.saveVersion(versionA);
    await repository.saveVersion(versionB);
    await repository.setCurrentVersion(versionB.id);

    expect(await repository.loadState()).toMatchObject({
      currentVersionId: versionB.id,
      versions: [versionA, versionB],
    });
  });

  it("clears current selection when deleting the active version", async () => {
    const repository = new InMemoryImportedDatasetRepository();
    const version = makeVersion("version-a");

    await repository.saveVersion(version);
    await repository.setCurrentVersion(version.id);
    await repository.deleteVersion(version.id);

    expect(await repository.loadState()).toEqual({
      currentVersionId: null,
      versions: [],
    });
  });

  it("returns cloned state so callers cannot mutate stored versions", async () => {
    const repository = new InMemoryImportedDatasetRepository();
    const version = makeVersion("version-a");

    await repository.saveVersion(version);
    const state = await repository.loadState();
    state.versions[0].records[0].campaign = "Mutated";

    expect((await repository.loadState()).versions[0].records[0].campaign).not
      .toBe("Mutated");
  });
});
