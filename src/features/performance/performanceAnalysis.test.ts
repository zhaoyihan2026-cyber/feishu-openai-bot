import type { FilterState } from "../../domain/filters";
import type { AcquisitionRecord } from "../../domain/types";
import {
  applyDrillPath,
  buildDailyDetailRows,
  buildDailySeries,
  deriveBaselinePath,
  drillDimensions,
  groupDimension,
  nextDimension,
  searchDimensionRows,
  truncateDrillPath,
  truncateDrillPathToBaseline,
} from "./performanceAnalysis";

const baseRecord: AcquisitionRecord = {
  id: "meta-us",
  date: "2026-06-01",
  updatedAt: "2026-06-02T00:00:00Z",
  app: "Demo",
  platform: "Meta Ads",
  account: "Meta Growth",
  country: "US",
  os: "iOS",
  campaign: "Meta Campaign",
  adGroup: "US iOS",
  creative: "Meta Video",
  creativeType: "Video",
  thumbnail: "/meta.webp",
  impressions: 1_000,
  clicks: 100,
  installs: 20,
  activations: 10,
  payers: 2,
  spendUsd: 100,
  revenueD7Usd: 80,
  revenueD30Usd: 120,
  budgetUsd: 140,
};

const records: AcquisitionRecord[] = [
  baseRecord,
  {
    ...baseRecord,
    id: "meta-ca",
    country: "CA",
    installs: 10,
    activations: 8,
    payers: 1,
    spendUsd: 100,
    revenueD7Usd: 20,
  },
  {
    ...baseRecord,
    id: "google-us",
    platform: "Google Ads",
    account: "Google Growth",
    campaign: "Google Campaign",
    creative: "Google Image",
    creativeType: "Image",
    impressions: 2_000,
    clicks: 120,
    installs: 40,
    activations: 12,
    payers: 4,
    spendUsd: 160,
    revenueD7Usd: 120,
  },
];

const filters: FilterState = {
  dateFrom: "2026-05-08",
  dateTo: "2026-06-06",
  apps: [],
  platforms: ["Meta Ads"],
  accounts: ["Meta Growth"],
  countries: ["US"],
  operatingSystems: ["iOS"],
};

describe("performance drill helpers", () => {
  it("uses the required drill order and derives singleton global filters", () => {
    expect(drillDimensions).toEqual([
      "platform",
      "account",
      "country",
      "os",
      "campaign",
      "adGroup",
      "creative",
    ]);
    expect(deriveBaselinePath(filters)).toEqual([
      { dimension: "platform", value: "Meta Ads" },
      { dimension: "account", value: "Meta Growth" },
      { dimension: "country", value: "US" },
      { dimension: "os", value: "iOS" },
    ]);
  });

  it("filters records by the local path and truncates without mutation", () => {
    const path = [
      { dimension: "platform", value: "Meta Ads" },
      { dimension: "country", value: "US" },
    ] as const;

    expect(applyDrillPath(records, path).map(({ id }) => id)).toEqual([
      "meta-us",
    ]);
    expect(truncateDrillPath(path, 1)).toEqual([
      { dimension: "platform", value: "Meta Ads" },
    ]);
    expect(path).toHaveLength(2);
  });

  it("preserves noncontiguous global baseline selections when truncating", () => {
    const baseline = [
      { dimension: "platform", value: "Meta Ads" },
      { dimension: "country", value: "US" },
    ] as const;
    const path = [
      baseline[0],
      { dimension: "account", value: "Meta Growth" },
      baseline[1],
    ] as const;

    expect(truncateDrillPathToBaseline(path, baseline)).toEqual(baseline);
    expect(
      truncateDrillPathToBaseline(path, baseline, "platform"),
    ).toEqual(baseline);
    expect(
      truncateDrillPathToBaseline(path, baseline, "account"),
    ).toEqual(path);
  });

  it("continues immediately after the clicked noncontiguous dimension", () => {
    const path = [
      { dimension: "campaign", value: "Meta Campaign" },
      { dimension: "adGroup", value: "US iOS" },
    ] as const;
    const truncated = truncateDrillPathToBaseline(path, [], "campaign");

    expect(truncated).toEqual([
      { dimension: "campaign", value: "Meta Campaign" },
    ]);
    expect(nextDimension(truncated, "campaign")).toBe("adGroup");
  });

  it("groups totals and recomputes ratios instead of averaging them", () => {
    const grouped = groupDimension(records, "platform", "spend");
    const meta = grouped.find(({ value }) => value === "Meta Ads");

    expect(meta).toMatchObject({
      spendUsd: 200,
      installs: 30,
      activations: 18,
      cpi: 200 / 30,
      activationRate: 18 / 30,
      d7Roas: 100 / 200,
      contribution: 200 / 360,
    });
    expect(grouped.map(({ value }) => value)).toEqual([
      "Meta Ads",
      "Google Ads",
    ]);
  });

  it("supports install contribution and case-insensitive row search", () => {
    const grouped = groupDimension(records, "platform", "installs");

    expect(grouped[0]).toMatchObject({
      value: "Google Ads",
      contribution: 40 / 70,
    });
    expect(searchDimensionRows(grouped, "mEtA").map(({ value }) => value))
      .toEqual(["Meta Ads"]);
  });

  it("builds daily totals with recomputed D7 ROAS", () => {
    expect(buildDailySeries(records)).toEqual([
      {
        date: "2026-06-01",
        spendUsd: 360,
        installs: 70,
        d7Roas: 220 / 360,
      },
    ]);
  });

  it("builds date-level detail rows for the current drill context", () => {
    const dailyRecords: AcquisitionRecord[] = [
      {
        ...baseRecord,
        id: "meta-2026-06-02",
        date: "2026-06-02",
        campaign: "Launch Campaign",
        adGroup: "US iOS Prospecting",
        creative: "Launch Video A",
        spendUsd: 75,
        impressions: 1_500,
        clicks: 150,
        installs: 15,
        activations: 9,
        payers: 3,
        revenueD7Usd: 30,
      },
      {
        ...baseRecord,
        id: "meta-2026-06-01",
        date: "2026-06-01",
        campaign: "Launch Campaign",
        adGroup: "US iOS Prospecting",
        creative: "Launch Video A",
        spendUsd: 50,
        impressions: 1_000,
        clicks: 100,
        installs: 10,
        activations: 5,
        payers: 1,
        revenueD7Usd: 15,
      },
    ];

    const detailRows = buildDailyDetailRows(dailyRecords, "platform", "spend");

    expect(detailRows).toMatchObject([
      {
        id: "2026-06-02|Meta Ads|Meta Growth|US|iOS|Launch Campaign|US iOS Prospecting|Launch Video A",
        date: "2026-06-02",
        value: "Meta Ads",
        platform: "Meta Ads",
        campaign: "Launch Campaign",
        adGroup: "US iOS Prospecting",
        creative: "Launch Video A",
        spendUsd: 75,
        impressions: 1_500,
        clicks: 150,
        installs: 15,
        activations: 9,
        payers: 3,
        cpi: 5,
        cpr: 75 / 9,
        cpp: 25,
        contribution: 75 / 125,
      },
      {
        date: "2026-06-01",
        value: "Meta Ads",
        campaign: "Launch Campaign",
        creative: "Launch Video A",
        spendUsd: 50,
        contribution: 50 / 125,
      },
    ]);
  });
});
