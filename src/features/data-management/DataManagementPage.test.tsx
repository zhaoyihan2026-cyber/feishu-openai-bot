import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { mockRecords } from "../../data/mock/records";
import { buildDatasetSummary } from "../../data/import/datasetSummary";
import { InMemoryImportedDatasetRepository } from "../../data/import/InMemoryImportedDatasetRepository";
import type { ImportedDatasetVersion } from "../../data/import/types";
import { DataManagementPage } from "./DataManagementPage";

const validCsv = [
  "Date,Platform,Campaign,Spend,Impressions,Clicks,Installs",
  "2026-06-09,facebook,Launch,$120.50,\"1,000\",50,20",
].join("\n");

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

function renderPage(repository = new InMemoryImportedDatasetRepository()) {
  render(<DataManagementPage repository={repository} />);
  return repository;
}

describe("DataManagementPage", () => {
  it("shows mock state when no imported version is active", async () => {
    renderPage();

    expect(await screen.findByText("当前使用模拟数据")).toBeInTheDocument();
    expect(screen.getByLabelText("导入文件")).toBeInTheDocument();
  });

  it("uploads CSV, previews mapping, and confirms replace import", async () => {
    const user = userEvent.setup();
    const repository = renderPage();
    const file = new File([validCsv], "meta-import.csv", { type: "text/csv" });

    await user.upload(await screen.findByLabelText("导入文件"), file);

    expect(await screen.findByText("字段识别")).toBeInTheDocument();
    expect(screen.getByText("spendUsd <- Spend")).toBeInTheDocument();
    expect(screen.getByText("Meta Ads")).toBeInTheDocument();
    expect(screen.getByText("有效行 1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "覆盖导入" }));

    await waitFor(async () => {
      const state = await repository.loadState();
      expect(state.versions).toHaveLength(1);
      expect(state.currentVersionId).toBe(state.versions[0].id);
      expect(state.versions[0].records[0]).toMatchObject({
        platform: "Meta Ads",
        campaign: "Launch",
      });
    });
    expect(await screen.findByText("当前使用导入数据")).toBeInTheDocument();
  });

  it("appends to the current version by creating a new version", async () => {
    const user = userEvent.setup();
    const repository = new InMemoryImportedDatasetRepository();
    await repository.saveVersion(makeVersion("base-version"));
    await repository.setCurrentVersion("base-version");
    renderPage(repository);
    const file = new File([validCsv], "append.csv", { type: "text/csv" });

    await user.upload(await screen.findByLabelText("导入文件"), file);
    await screen.findByText("字段识别");
    await user.click(screen.getByRole("button", { name: "追加导入" }));

    await waitFor(async () => {
      const state = await repository.loadState();
      expect(state.versions).toHaveLength(2);
      expect(state.versions[0].records).toHaveLength(1);
      expect(state.versions[1].records).toHaveLength(2);
      expect(state.currentVersionId).toBe(state.versions[1].id);
    });
  });

  it("switches versions and clears imported data", async () => {
    const user = userEvent.setup();
    const repository = new InMemoryImportedDatasetRepository();
    await repository.saveVersion(makeVersion("older"));
    await repository.saveVersion(makeVersion("newer"));
    await repository.setCurrentVersion("newer");
    renderPage(repository);

    const olderRow = await screen.findByRole("row", { name: /older/ });
    await user.click(within(olderRow).getByRole("button", { name: "设为当前版本" }));

    await waitFor(async () => {
      expect((await repository.loadState()).currentVersionId).toBe("older");
    });

    await user.click(screen.getByRole("button", { name: "清空本地导入数据" }));

    await waitFor(async () => {
      expect(await repository.loadState()).toEqual({
        currentVersionId: null,
        versions: [],
      });
    });
    expect(await screen.findByText("当前使用模拟数据")).toBeInTheDocument();
  });
});
