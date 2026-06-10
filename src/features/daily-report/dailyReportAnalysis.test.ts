import type { AcquisitionRecord } from "../../domain/types";
import {
  buildDailyReportViewModel,
  dailyReportMetrics,
} from "./dailyReportAnalysis";

const baseRecord: AcquisitionRecord = {
  id: "r1",
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
  d0Roas: 0.3,
  d1RetentionRate: 0.2,
  d7RetentionRate: 0.1,
};

describe("dailyReportAnalysis", () => {
  it("builds dynamic channel title, date columns, and country rows", () => {
    const viewModel = buildDailyReportViewModel(
      [
        baseRecord,
        {
          ...baseRecord,
          id: "r2",
          date: "2026-04-02",
          country: "CA",
          spendUsd: 50,
          installs: 10,
          activations: 7,
          payers: 1,
          revenueD7Usd: 20,
        },
      ],
      { dateFrom: "2026-04-01", dateTo: "2026-04-02" },
    );

    expect(viewModel.channelName).toBe("Meta Ads");
    expect(viewModel.title).toBe("Meta Ads - 新用户行为");
    expect(viewModel.dates).toEqual(["2026-04-02", "2026-04-01"]);
    expect(viewModel.countryRows.map(({ country }) => country)).toEqual([
      "US",
      "CA",
    ]);
    expect(viewModel.countryRows[0]).toMatchObject({
      country: "US",
      spendUsd: 100,
      installs: 20,
      activations: 10,
      payers: 2,
      d0Roas: 0.3,
      d1RetentionRate: 0.2,
      d7RetentionRate: 0.1,
    });
  });

  it("uses all-channel title when records include multiple platforms", () => {
    const viewModel = buildDailyReportViewModel(
      [
        baseRecord,
        { ...baseRecord, id: "google", platform: "Google Ads" },
      ],
      { dateFrom: "2026-04-01", dateTo: "2026-04-01" },
    );

    expect(viewModel.channelName).toBe("全部渠道");
    expect(viewModel.title).toBe("全部渠道 - 新用户行为");
  });

  it("builds campaign and creative date matrices with stage totals", () => {
    const viewModel = buildDailyReportViewModel(
      [
        baseRecord,
        {
          ...baseRecord,
          id: "r2",
          date: "2026-04-02",
          spendUsd: 80,
          installs: 8,
          activations: 4,
          payers: 1,
          revenueD7Usd: 16,
          d1RetentionRate: 0.5,
          d7RetentionRate: 0.25,
        },
      ],
      { dateFrom: "2026-04-01", dateTo: "2026-04-02" },
    );

    const campaign = viewModel.campaignRows[0];
    const spendMetric = campaign.metrics.find(({ id }) => id === "spendUsd");
    const d7Metric = campaign.metrics.find(
      ({ id }) => id === "d7RetentionRate",
    );

    expect(dailyReportMetrics.map(({ id }) => id)).toContain("d0Roas");
    expect(campaign.label).toBe("Meta Campaign");
    expect(spendMetric).toMatchObject({
      label: "消耗",
      total: 180,
      valuesByDate: {
        "2026-04-01": 100,
        "2026-04-02": 80,
      },
    });
    expect(d7Metric?.total).toBeCloseTo((0.1 * 20 + 0.25 * 8) / 28);
    expect(viewModel.creativeRows[0].label).toBe("Meta Campaign / Video A");
  });
});
