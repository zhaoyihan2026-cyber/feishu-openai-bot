import type { AcquisitionRecord } from "../../domain/types";
import {
  buildCreativeDailySeries,
  createDefaultCreativeFilters,
  filterAndSortCreatives,
  getCreativeStatus,
  groupCreatives,
  resolveSelectedCreative,
  type CreativeSummary,
} from "./creativeAnalysis";

function record(
  overrides: Partial<AcquisitionRecord> = {},
): AcquisitionRecord {
  return {
    id: "record-1",
    date: "2026-06-01",
    updatedAt: "2026-06-01T12:00:00Z",
    app: "Creator Workflow",
    platform: "Meta Ads",
    account: "Meta Ads Growth Account",
    country: "US",
    os: "iOS",
    campaign: "Meta Creator Acquisition",
    adGroup: "US iOS",
    creative: "Meta Creator Video",
    creativeType: "Video",
    thumbnail: "/creative-thumbnails/creator-workflow.webp",
    impressions: 100,
    clicks: 10,
    installs: 4,
    activations: 2,
    payers: 1,
    spendUsd: 12,
    revenueD7Usd: 6,
    revenueD30Usd: 10,
    budgetUsd: 15,
    ...overrides,
  };
}

function creative(
  overrides: Partial<CreativeSummary> = {},
): CreativeSummary {
  return {
    creative: "Alpha Video",
    platform: "Meta Ads",
    campaign: "Alpha Campaign",
    adGroup: "US iOS",
    type: "Video",
    thumbnail: "/creative-thumbnails/creator-workflow.webp",
    status: "观察",
    impressions: 100,
    clicks: 10,
    installs: 4,
    activations: 2,
    spendUsd: 12,
    revenueD7Usd: 6,
    ctr: 0.1,
    cpi: 3,
    activationRate: 0.5,
    d7Roas: 0.5,
    ...overrides,
  };
}

describe("creative analysis", () => {
  it("groups creative metrics from raw totals instead of averaging ratios", () => {
    const rows = groupCreatives([
      record(),
      record({
        id: "record-2",
        date: "2026-06-02",
        impressions: 300,
        clicks: 15,
        installs: 6,
        activations: 3,
        spendUsd: 18,
        revenueD7Usd: 12,
      }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      creative: "Meta Creator Video",
      platform: "Meta Ads",
      campaign: "Meta Creator Acquisition",
      adGroup: "US iOS",
      type: "Video",
      thumbnail: "/creative-thumbnails/creator-workflow.webp",
      impressions: 400,
      clicks: 25,
      installs: 10,
      activations: 5,
      spendUsd: 30,
      revenueD7Usd: 18,
      ctr: 25 / 400,
      cpi: 3,
      activationRate: 0.5,
      d7Roas: 0.6,
      status: "观察",
    });
  });

  it("classifies exact status boundaries and gives excellent precedence", () => {
    expect(getCreativeStatus({ d7Roas: 0.5, cpi: 2.5 })).toBe("优秀");
    expect(getCreativeStatus({ d7Roas: 0.5, cpi: 3.5 })).toBe("观察");
    expect(getCreativeStatus({ d7Roas: 0.3, cpi: 3.5 })).toBe("观察");
    expect(getCreativeStatus({ d7Roas: 0.2999, cpi: 2.5 })).toBe("较差");
    expect(getCreativeStatus({ d7Roas: 0.7, cpi: 3.5001 })).toBe("较差");
    expect(getCreativeStatus({ d7Roas: 0.5, cpi: 2.5 })).not.toBe("较差");
  });

  it("filters by platform, type, status, and searchable identity fields", () => {
    const rows = [
      creative({ creative: "Alpha Video", status: "优秀" }),
      creative({
        creative: "Beta Image",
        platform: "Google Ads",
        campaign: "Finance Scale",
        adGroup: "CA Android",
        type: "Image",
        status: "较差",
      }),
      creative({
        creative: "Gamma Playable",
        platform: "TikTok Ads",
        campaign: "Wellness Growth",
        adGroup: "JP iOS",
        type: "Playable",
        status: "观察",
      }),
    ];

    expect(
      filterAndSortCreatives(rows, {
        ...createDefaultCreativeFilters(),
        platform: "Google Ads",
        type: "Image",
        status: "较差",
        search: "finance",
      }).map(({ creative: name }) => name),
    ).toEqual(["Beta Image"]);
    expect(
      filterAndSortCreatives(rows, {
        ...createDefaultCreativeFilters(),
        search: "jp ios",
      }).map(({ creative: name }) => name),
    ).toEqual(["Gamma Playable"]);
  });

  it.each([
    ["spend-desc", ["Alpha", "Bravo", "Charlie"]],
    ["ctr-desc", ["Charlie", "Alpha", "Bravo"]],
    ["cpi-asc", ["Bravo", "Alpha", "Charlie"]],
    ["activation-rate-desc", ["Charlie", "Alpha", "Bravo"]],
    ["d7-roas-desc", ["Charlie", "Alpha", "Bravo"]],
  ] as const)("sorts by %s with creative name as the tie breaker", (sort, expected) => {
    const rows = [
      creative({
        creative: "Charlie",
        spendUsd: 10,
        ctr: 0.3,
        cpi: 4,
        activationRate: 0.8,
        d7Roas: 0.7,
      }),
      creative({
        creative: "Bravo",
        spendUsd: 20,
        ctr: 0.1,
        cpi: 2,
        activationRate: 0.4,
        d7Roas: 0.4,
      }),
      creative({
        creative: "Alpha",
        spendUsd: 20,
        ctr: 0.2,
        cpi: 3,
        activationRate: 0.6,
        d7Roas: 0.5,
      }),
    ];

    expect(
      filterAndSortCreatives(rows, {
        ...createDefaultCreativeFilters(),
        sort,
      }).map(({ creative: name }) => name),
    ).toEqual(expected);
  });

  it("resets local controls and preserves only a still-visible selection", () => {
    expect(createDefaultCreativeFilters()).toEqual({
      platform: "",
      type: "",
      status: "",
      search: "",
      sort: "spend-desc",
    });

    const rows = [creative({ creative: "Alpha" }), creative({ creative: "Beta" })];
    expect(resolveSelectedCreative(rows, "Beta")).toBe("Beta");
    expect(resolveSelectedCreative(rows, "Missing")).toBe("Alpha");
    expect(resolveSelectedCreative([], "Alpha")).toBeNull();
  });

  it("fills every available date and keeps zero-denominator ratios safe", () => {
    const records = [
      record({ id: "alpha-1", creative: "Alpha", date: "2026-06-01" }),
      record({
        id: "other-2",
        creative: "Other",
        date: "2026-06-02",
        spendUsd: 0,
        installs: 0,
      }),
      record({
        id: "alpha-3",
        creative: "Alpha",
        date: "2026-06-03",
        spendUsd: 0,
        installs: 0,
        revenueD7Usd: 4,
      }),
    ];

    expect(buildCreativeDailySeries(records, "Alpha")).toEqual([
      { date: "2026-06-01", spendUsd: 12, cpi: 3, d7Roas: 0.5 },
      { date: "2026-06-02", spendUsd: 0, cpi: 0, d7Roas: 0 },
      { date: "2026-06-03", spendUsd: 0, cpi: 0, d7Roas: 0 },
    ]);
    expect(buildCreativeDailySeries(records, null)).toEqual([]);
  });
});
