import { mockRecords, MOCK_DATA_AS_OF } from "../../data/mock/records";
import type { AcquisitionRecord } from "../../domain/types";
import {
  aggregateCountries,
  aggregatePlatforms,
  buildDashboardViewModel,
  buildDailySeries,
  calculateBudgetPace,
  calculateTimePace,
  splitRecordsByMidpoint,
} from "./dashboardViewModel";

const baseRecord: AcquisitionRecord = {
  id: "record-1",
  date: "2026-06-01",
  updatedAt: "2026-06-01T12:00:00Z",
  app: "Example App",
  platform: "Meta Ads",
  account: "Primary Account",
  country: "US",
  os: "iOS",
  campaign: "Launch",
  adGroup: "Broad",
  creative: "Demo Video",
  creativeType: "Video",
  thumbnail: "/demo.webp",
  impressions: 1_000,
  clicks: 100,
  installs: 10,
  activations: 6,
  payers: 2,
  spendUsd: 20,
  revenueD7Usd: 10,
  revenueD30Usd: 30,
  budgetUsd: 25,
};

function record(
  id: string,
  date: string,
  overrides: Partial<AcquisitionRecord> = {},
): AcquisitionRecord {
  return { ...baseRecord, id, date, ...overrides };
}

describe("splitRecordsByMidpoint", () => {
  it("uses a single selected day as the current period with no previous period", () => {
    const result = splitRecordsByMidpoint(
      [record("selected-day", "2026-06-01", { spendUsd: 42 })],
      "2026-06-01",
      "2026-06-01",
    );

    expect(result.previousDates).toEqual([]);
    expect(result.currentDates).toEqual(["2026-06-01"]);
    expect(result.previous).toEqual([]);
    expect(result.current.map(({ id }) => id)).toEqual(["selected-day"]);
  });

  it("splits the selected calendar interval into previous and current halves", () => {
    const records = [
      record("day-4", "2026-06-04"),
      record("day-1", "2026-06-01"),
      record("day-3", "2026-06-03"),
      record("day-2-a", "2026-06-02"),
      record("day-2-b", "2026-06-02"),
    ];

    const result = splitRecordsByMidpoint(
      records,
      "2026-06-01",
      "2026-06-04",
    );

    expect(result.previous.map(({ id }) => id)).toEqual([
      "day-1",
      "day-2-a",
      "day-2-b",
    ]);
    expect(result.current.map(({ id }) => id)).toEqual(["day-3", "day-4"]);
    expect(result.previousDates).toEqual(["2026-06-01", "2026-06-02"]);
    expect(result.currentDates).toEqual(["2026-06-03", "2026-06-04"]);
  });

  it("omits the middle date when an odd range needs equal comparison periods", () => {
    const result = splitRecordsByMidpoint(
      [
        record("day-5", "2026-06-05"),
        record("day-3", "2026-06-03"),
        record("day-1", "2026-06-01"),
        record("day-4", "2026-06-04"),
        record("day-2", "2026-06-02"),
      ],
      "2026-06-01",
      "2026-06-05",
    );

    expect(result.previousDates).toEqual(["2026-06-01", "2026-06-02"]);
    expect(result.currentDates).toEqual(["2026-06-04", "2026-06-05"]);
    expect(result.previous.map(({ id }) => id)).toEqual(["day-1", "day-2"]);
    expect(result.current.map(({ id }) => id)).toEqual(["day-4", "day-5"]);
  });

  it("uses selected calendar days even when records are sparse", () => {
    const result = splitRecordsByMidpoint(
      [
        record("previous-only", "2026-06-02"),
        record("current-only", "2026-06-05"),
      ],
      "2026-06-01",
      "2026-06-06",
    );

    expect(result.previousDates).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
    ]);
    expect(result.currentDates).toEqual([
      "2026-06-04",
      "2026-06-05",
      "2026-06-06",
    ]);
    expect(result.previous.map(({ id }) => id)).toEqual(["previous-only"]);
    expect(result.current.map(({ id }) => id)).toEqual(["current-only"]);
  });

  it("keeps the default 30-day range as two 15-day periods", () => {
    const result = splitRecordsByMidpoint(
      mockRecords,
      "2026-05-08",
      "2026-06-06",
    );

    expect(result.previousDates).toHaveLength(15);
    expect(result.currentDates).toHaveLength(15);
    expect(result.previousDates.at(-1)).toBe("2026-05-22");
    expect(result.currentDates[0]).toBe("2026-05-23");
  });
});

describe("daily series", () => {
  it("returns every selected day and calculates ratios from raw daily totals", () => {
    const series = buildDailySeries(
      [
        record("a", "2026-06-01", {
          installs: 3,
          spendUsd: 10,
          revenueD7Usd: 4,
        }),
        record("b", "2026-06-01", {
          installs: 7,
          spendUsd: 30,
          revenueD7Usd: 11,
        }),
        record("c", "2026-06-03", {
          installs: 5,
          spendUsd: 20,
          revenueD7Usd: 10,
        }),
      ],
      "2026-06-01",
      "2026-06-03",
    );

    expect(series).toEqual([
      { date: "2026-06-01", spendUsd: 40, installs: 10, d7Roas: 0.375 },
      { date: "2026-06-02", spendUsd: 0, installs: 0, d7Roas: 0 },
      { date: "2026-06-03", spendUsd: 20, installs: 5, d7Roas: 0.5 },
    ]);
  });
});

describe("pace calculations", () => {
  it("calculates budget pace from unrounded spend and budget totals", () => {
    expect(
      calculateBudgetPace([
        record("a", "2026-06-01", { spendUsd: 30, budgetUsd: 50 }),
        record("b", "2026-06-02", { spendUsd: 20, budgetUsd: 50 }),
      ]),
    ).toBe(0.5);
    expect(calculateBudgetPace([])).toBe(0);
  });

  it("calculates inclusive selected-interval time pace and clamps it", () => {
    expect(
      calculateTimePace(
        "2026-06-01",
        "2026-06-10",
        "2026-06-06T00:00:00Z",
      ),
    ).toBe(0.5);
    expect(
      calculateTimePace(
        "2026-06-01",
        "2026-06-10",
        "2026-05-31T00:00:00Z",
      ),
    ).toBe(0);
    expect(
      calculateTimePace(
        "2026-06-01",
        "2026-06-10",
        "2026-06-20T00:00:00Z",
      ),
    ).toBe(1);
  });
});

describe("dimension summaries", () => {
  const records = [
    record("meta-us", "2026-06-01", {
      platform: "Meta Ads",
      country: "US",
      installs: 10,
      activations: 5,
      payers: 2,
      spendUsd: 20,
      revenueD7Usd: 10,
    }),
    record("meta-ca", "2026-06-02", {
      platform: "Meta Ads",
      country: "CA",
      installs: 5,
      activations: 4,
      payers: 1,
      spendUsd: 15,
      revenueD7Usd: 9,
    }),
    record("google-us", "2026-06-01", {
      platform: "Google Ads",
      country: "US",
      installs: 20,
      activations: 12,
      payers: 3,
      spendUsd: 40,
      revenueD7Usd: 28,
    }),
  ];

  it("aggregates platform metrics without averaging record ratios", () => {
    const platforms = aggregatePlatforms(records);

    expect(platforms.map(({ platform }) => platform)).toEqual([
      "Google Ads",
      "Meta Ads",
    ]);
    expect(platforms[1]).toMatchObject({
      spendUsd: 35,
      installs: 15,
      activations: 9,
      payers: 3,
      cpi: 35 / 15,
      activationRate: 0.6,
      d7Roas: 19 / 35,
    });
  });

  it("ranks countries by spend with aggregated performance metrics", () => {
    const countries = aggregateCountries(records);

    expect(countries.map(({ country }) => country)).toEqual(["US", "CA"]);
    expect(countries[0]).toMatchObject({
      spendUsd: 60,
      installs: 30,
      payers: 5,
      cpi: 2,
      d7Roas: 38 / 60,
    });
  });
});

describe("buildDashboardViewModel", () => {
  it("keeps actual selected-day metrics and marks comparisons as new", () => {
    const viewModel = buildDashboardViewModel(
      [
        record("selected-day", "2026-06-01", {
          installs: 10,
          activations: 7,
          payers: 2,
          spendUsd: 25,
          revenueD7Usd: 15,
          revenueD30Usd: 40,
          budgetUsd: 20,
        }),
      ],
      {
        dateFrom: "2026-06-01",
        dateTo: "2026-06-01",
        mockAsOfTimestamp: "2026-06-02T00:00:00Z",
      },
    );

    expect(viewModel.currentMetrics).toMatchObject({
      spendUsd: 25,
      installs: 10,
      cpi: 2.5,
      activationRate: 0.7,
      payers: 2,
      d7Roas: 0.6,
      d30Ltv: 20,
    });
    expect(viewModel.budgetPace).toBe(1.25);
    expect(viewModel.comparisons.spendUsd).toMatchObject({
      current: 25,
      previous: 0,
      change: null,
      trend: "new",
    });
  });

  it("displays current-period KPIs and compares them with the previous period", () => {
    const viewModel = buildDashboardViewModel(
      [
        record("previous", "2026-06-01", {
          installs: 10,
          activations: 5,
          payers: 2,
          spendUsd: 20,
          revenueD7Usd: 10,
          revenueD30Usd: 30,
        }),
        record("current", "2026-06-02", {
          installs: 20,
          activations: 14,
          payers: 5,
          spendUsd: 30,
          revenueD7Usd: 18,
          revenueD30Usd: 60,
        }),
      ],
      {
        dateFrom: "2026-06-01",
        dateTo: "2026-06-02",
        mockAsOfTimestamp: "2026-06-02T00:00:00Z",
      },
    );

    expect(viewModel.currentMetrics).toMatchObject({
      spendUsd: 30,
      installs: 20,
      cpi: 1.5,
      activationRate: 0.7,
      payers: 5,
      d7Roas: 0.6,
      d30Ltv: 12,
    });
    expect(viewModel.selectedRangeMetrics.spendUsd).toBe(50);
    expect(viewModel.comparisons.cpi.change).toBe(-0.25);
    expect(viewModel.comparisons.d7Roas.change).toBeCloseTo(0.2);
    expect(viewModel.comparisons.activationRate.change).toBeCloseTo(0.4);
  });

  it("represents new spend, installs, and payers when the previous baseline is zero", () => {
    const viewModel = buildDashboardViewModel(
      [
        record("previous", "2026-06-01", {
          installs: 0,
          activations: 0,
          payers: 0,
          spendUsd: 0,
          revenueD7Usd: 0,
          revenueD30Usd: 0,
          budgetUsd: 0,
        }),
        record("current", "2026-06-02", {
          installs: 10,
          payers: 2,
          spendUsd: 20,
        }),
      ],
      {
        dateFrom: "2026-06-01",
        dateTo: "2026-06-02",
        mockAsOfTimestamp: "2026-06-03T00:00:00Z",
      },
    );

    expect(viewModel.comparisons.spendUsd).toMatchObject({
      current: 20,
      previous: 0,
      change: null,
      trend: "new",
    });
    expect(viewModel.comparisons.installs).toMatchObject({
      current: 10,
      previous: 0,
      change: null,
      trend: "new",
    });
    expect(viewModel.comparisons.payers).toMatchObject({
      current: 2,
      previous: 0,
      change: null,
      trend: "new",
    });
  });

  it("keeps a zero-versus-zero baseline neutral", () => {
    const viewModel = buildDashboardViewModel([], {
      dateFrom: "2026-06-01",
      dateTo: "2026-06-02",
      mockAsOfTimestamp: "2026-06-03T00:00:00Z",
    });

    expect(viewModel.comparisons.spendUsd).toEqual({
      current: 0,
      previous: 0,
      change: 0,
      trend: "flat",
    });
  });

  it("uses the shared selected calendar periods for every platform anomaly", () => {
    const viewModel = buildDashboardViewModel(
      [
        record("meta-previous", "2026-06-01", {
          platform: "Meta Ads",
          installs: 10,
          spendUsd: 10,
          revenueD7Usd: 5,
          updatedAt: "2026-06-06T12:00:00Z",
        }),
        record("meta-current", "2026-06-06", {
          platform: "Meta Ads",
          installs: 10,
          spendUsd: 13,
          revenueD7Usd: 6.5,
          updatedAt: "2026-06-06T12:00:00Z",
        }),
        record("google-previous", "2026-06-03", {
          platform: "Google Ads",
          installs: 10,
          spendUsd: 10,
          revenueD7Usd: 5,
          updatedAt: "2026-06-06T12:00:00Z",
        }),
        record("google-current", "2026-06-04", {
          platform: "Google Ads",
          installs: 10,
          spendUsd: 13,
          revenueD7Usd: 6.5,
          updatedAt: "2026-06-06T12:00:00Z",
        }),
      ],
      {
        dateFrom: "2026-06-01",
        dateTo: "2026-06-06",
        mockAsOfTimestamp: "2026-06-07T00:00:00Z",
      },
    );

    expect(viewModel.anomalies.map(({ id }) => id)).toEqual([
      "cpi:Google%20Ads",
      "cpi:Meta%20Ads",
    ]);
  });

  it("surfaces stable, de-duplicated mock anomalies by platform", () => {
    const viewModel = buildDashboardViewModel(mockRecords, {
      dateFrom: "2026-05-08",
      dateTo: "2026-06-06",
      mockAsOfTimestamp: MOCK_DATA_AS_OF,
    });

    expect(viewModel.anomalies.map(({ id }) => id)).toEqual([
      "dataDelay:LinkedIn%20Ads",
      "cpi:Meta%20Ads",
      "budgetPace:Microsoft%20Ads",
      "d7Roas:TikTok%20Ads",
    ]);
    expect(
      viewModel.anomalies.find(
        ({ id }) => id === "budgetPace:Microsoft%20Ads",
      ),
    ).toMatchObject({
      currentValue: expect.closeTo(1.18, 2),
      comparisonValue: 1,
    });
    expect(new Set(viewModel.anomalies.map(({ id }) => id)).size).toBe(
      viewModel.anomalies.length,
    );
    expect(
      viewModel.anomalies.every(({ scope }) =>
        viewModel.platforms.some(({ platform }) => platform === scope),
      ),
    ).toBe(true);
  });
});
