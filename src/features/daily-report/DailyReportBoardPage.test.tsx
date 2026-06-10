import { render, screen, within } from "@testing-library/react";
import { useEffect } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { FilterProvider, useFilters } from "../../state/FilterContext";
import type { AppDataContext } from "../../components/layout/AppShell";
import { DailyReportBoardPage } from "./DailyReportBoardPage";

const records: AppDataContext["records"] = [
  {
    id: "meta-us-1",
    date: "2026-04-01",
    updatedAt: "2026-06-10T00:00:00.000Z",
    app: "Dara Casino",
    platform: "Meta Ads",
    account: "Agency",
    country: "US",
    os: "iOS",
    campaign: "Meta Campaign",
    adGroup: "Broad",
    creative: "Video A",
    creativeType: "Video",
    thumbnail: "",
    impressions: 1_000,
    clicks: 100,
    installs: 20,
    activations: 10,
    payers: 2,
    spendUsd: 100,
    revenueD7Usd: 30,
    revenueD30Usd: 0,
    budgetUsd: 100,
    d1RetentionRate: 0.2,
    d7RetentionRate: 0.1,
  },
  {
    id: "meta-ca-2",
    date: "2026-04-02",
    updatedAt: "2026-06-10T00:00:00.000Z",
    app: "Dara Casino",
    platform: "Meta Ads",
    account: "Agency",
    country: "CA",
    os: "iOS",
    campaign: "Meta Campaign",
    adGroup: "Broad",
    creative: "Video A",
    creativeType: "Video",
    thumbnail: "",
    impressions: 500,
    clicks: 50,
    installs: 10,
    activations: 7,
    payers: 1,
    spendUsd: 50,
    revenueD7Usd: 20,
    revenueD30Usd: 0,
    budgetUsd: 50,
    d1RetentionRate: 0.4,
    d7RetentionRate: 0.2,
  },
];

const appData: AppDataContext = {
  records,
  filteredRecords: records,
  loading: false,
  error: null,
  mockAsOfTimestamp: "2026-06-10T00:00:00.000Z",
  dataSource: {
    type: "imported",
    label: "IGS-Dara Casino",
    recordCount: records.length,
    timestamp: "2026-06-10T00:00:00.000Z",
  },
  refreshData: () => {},
};

function renderPage() {
  function AprilFilters() {
    const { setFilters } = useFilters();

    useEffect(() => {
      setFilters({ dateFrom: "2026-04-01", dateTo: "2026-04-02" });
    }, [setFilters]);

    return null;
  }

  render(
    <FilterProvider>
      <AprilFilters />
      <MemoryRouter>
        <Routes>
          <Route
            path="/"
            element={<DailyReportBoardPage appData={appData} />}
          />
        </Routes>
      </MemoryRouter>
    </FilterProvider>,
  );
}

describe("DailyReportBoardPage", () => {
  it("renders a dynamic channel board with detailed date tables", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Meta Ads - 新用户行为" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^Mtg -/i)).not.toBeInTheDocument();

    const country = screen.getByRole("region", {
      name: "Meta Ads - 新用户行为 - 分国家",
    });
    expect(within(country).getByText("US")).toBeInTheDocument();
    expect(within(country).getByText("CA")).toBeInTheDocument();
    expect(within(country).getByText("D0 ROAS")).toBeInTheDocument();

    const campaign = screen.getByRole("region", {
      name: "Meta Ads - 新用户行为 - 分 Campaign",
    });
    expect(within(campaign).getByText("2026-04-02")).toBeInTheDocument();
    expect(within(campaign).getByText("2026-04-01")).toBeInTheDocument();
    expect(within(campaign).getByText("阶段汇总")).toBeInTheDocument();
    expect(within(campaign).getByText("Meta Campaign")).toBeInTheDocument();
    expect(within(campaign).getByText("消耗")).toBeInTheDocument();

    const creative = screen.getByRole("region", {
      name: "Meta Ads - 新用户行为 - 分 Campaign 分 Creative",
    });
    expect(within(creative).getByText("Meta Campaign / Video A"))
      .toBeInTheDocument();
  });
});
