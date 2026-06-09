import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import type { AcquisitionRecord } from "../../domain/types";
import { FilterProvider, useFilters } from "../../state/FilterContext";
import { GlobalFilters } from "./GlobalFilters";

const baseRecord: AcquisitionRecord = {
  id: "record-1",
  date: "2026-05-20",
  updatedAt: "2026-06-08T10:00:00Z",
  app: "Creator Workflow",
  platform: "Meta Ads",
  account: "Meta Ads Growth Account",
  country: "US",
  os: "iOS",
  campaign: "Launch",
  adGroup: "US iOS",
  creative: "Demo Video",
  creativeType: "Video",
  thumbnail: "/creative-thumbnails/creator-workflow.webp",
  impressions: 1_000,
  clicks: 100,
  installs: 20,
  activations: 12,
  payers: 2,
  spendUsd: 40,
  revenueD7Usd: 20,
  revenueD30Usd: 50,
  budgetUsd: 48,
};

const records = [
  createRecord("tiktok-wellness", {
    app: "Wellness Routine",
    platform: "TikTok Ads",
    account: "TikTok Ads Growth Account",
    country: "JP",
    os: "Android",
  }),
  createRecord("meta-creator", {
    app: "Creator Workflow",
    platform: "Meta Ads",
    account: "Meta Ads Growth Account",
    country: "US",
    os: "iOS",
  }),
  createRecord("google-finance", {
    app: "Finance Tracker",
    platform: "Google Ads",
    account: "Google Ads Growth Account",
    country: "DE",
    os: "Android",
  }),
  createRecord("meta-creator-duplicate", {
    app: "Creator Workflow",
    platform: "Meta Ads",
    account: "Meta Ads Growth Account",
    country: "US",
    os: "iOS",
  }),
];

function createRecord(
  id: string,
  overrides: Partial<AcquisitionRecord>,
): AcquisitionRecord {
  return { ...baseRecord, id, ...overrides };
}

function FilterStatus() {
  const { filters } = useFilters();

  return (
    <>
      <output aria-label="selected platforms">
        {JSON.stringify(filters.platforms)}
      </output>
      <output aria-label="selected apps">{JSON.stringify(filters.apps)}</output>
    </>
  );
}

function renderWithProvider(children: ReactNode) {
  return {
    user: userEvent.setup(),
    ...render(<FilterProvider>{children}</FilterProvider>),
  };
}

function optionLabels(control: HTMLElement): string[] {
  return within(control)
    .getAllByRole("option")
    .map((option) => option.textContent ?? "");
}

describe("GlobalFilters", () => {
  it("renders accessible controls with labels for each filter dimension", () => {
    renderWithProvider(<GlobalFilters records={records} />);

    expect(screen.getByLabelText("开始日期 From")).toBeInTheDocument();
    expect(screen.getByLabelText("结束日期 To")).toBeInTheDocument();
    expect(screen.getByLabelText("应用 App")).toBeInTheDocument();
    expect(screen.getByLabelText("平台 Platform")).toBeInTheDocument();
    expect(screen.getByLabelText("账户 Account")).toBeInTheDocument();
    expect(screen.getByLabelText("国家 Country")).toBeInTheDocument();
    expect(screen.getByLabelText("操作系统 OS")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "重置筛选 Reset filters" }),
    ).toBeInTheDocument();
  });

  it("derives unique sorted options from available records", () => {
    renderWithProvider(<GlobalFilters records={records} />);

    expect(optionLabels(screen.getByLabelText("应用 App"))).toEqual([
      "全部 All",
      "Creator Workflow",
      "Finance Tracker",
      "Wellness Routine",
    ]);
    expect(optionLabels(screen.getByLabelText("平台 Platform"))).toEqual([
      "全部 All",
      "Google Ads",
      "Meta Ads",
      "TikTok Ads",
    ]);
    expect(optionLabels(screen.getByLabelText("账户 Account"))).toEqual([
      "全部 All",
      "Google Ads Growth Account",
      "Meta Ads Growth Account",
      "TikTok Ads Growth Account",
    ]);
    expect(optionLabels(screen.getByLabelText("国家 Country"))).toEqual([
      "全部 All",
      "DE",
      "JP",
      "US",
    ]);
    expect(optionLabels(screen.getByLabelText("操作系统 OS"))).toEqual([
      "全部 All",
      "Android",
      "iOS",
    ]);
  });

  it("maps platform selection to a singleton context array", async () => {
    const { user } = renderWithProvider(
      <>
        <GlobalFilters records={records} />
        <FilterStatus />
      </>,
    );

    await user.selectOptions(screen.getByLabelText("平台 Platform"), "Meta Ads");

    expect(screen.getByLabelText("selected platforms")).toHaveTextContent(
      '["Meta Ads"]',
    );
  });

  it("resets controls to All and empties selected arrays", async () => {
    const { user } = renderWithProvider(
      <>
        <GlobalFilters records={records} />
        <FilterStatus />
      </>,
    );

    await user.selectOptions(screen.getByLabelText("平台 Platform"), "Meta Ads");
    await user.selectOptions(screen.getByLabelText("应用 App"), "Finance Tracker");
    await user.click(
      screen.getByRole("button", { name: "重置筛选 Reset filters" }),
    );

    expect(screen.getByLabelText("平台 Platform")).toHaveValue("");
    expect(screen.getByLabelText("应用 App")).toHaveValue("");
    expect(screen.getByLabelText("selected platforms")).toHaveTextContent("[]");
    expect(screen.getByLabelText("selected apps")).toHaveTextContent("[]");
  });
});
