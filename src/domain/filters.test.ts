import type { AcquisitionRecord } from "./types";
import {
  createDefaultFilters,
  DEFAULT_FILTERS,
  filterRecords,
  type FilterState,
} from "./filters";

const baseRecord: AcquisitionRecord = {
  id: "target",
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

function createRecord(
  id: string,
  overrides: Partial<AcquisitionRecord> = {},
): AcquisitionRecord {
  return { ...baseRecord, id, ...overrides };
}

function createFilters(overrides: Partial<FilterState> = {}): FilterState {
  return {
    ...createDefaultFilters(),
    ...overrides,
  };
}

describe("DEFAULT_FILTERS", () => {
  it("covers the current mock data range with no selected dimensions", () => {
    expect(DEFAULT_FILTERS).toEqual({
      dateFrom: "2026-05-08",
      dateTo: "2026-06-06",
      apps: [],
      platforms: [],
      accounts: [],
      countries: [],
      operatingSystems: [],
    });
  });

  it("is a deeply frozen readonly snapshot", () => {
    expect(Object.isFrozen(DEFAULT_FILTERS)).toBe(true);
    for (const selection of [
      DEFAULT_FILTERS.apps,
      DEFAULT_FILTERS.platforms,
      DEFAULT_FILTERS.accounts,
      DEFAULT_FILTERS.countries,
      DEFAULT_FILTERS.operatingSystems,
    ]) {
      expect(Object.isFrozen(selection)).toBe(true);
    }

    expect(() => {
      // @ts-expect-error Exported default selections are readonly.
      DEFAULT_FILTERS.apps.push("External mutation");
    }).toThrow(TypeError);
    expect(DEFAULT_FILTERS.apps).toEqual([]);
  });

  it("creates independent mutable filter states", () => {
    const first = createDefaultFilters();
    const second = createDefaultFilters();

    first.apps.push("Creator Workflow");
    first.platforms.push("Meta Ads");

    expect(first.apps).toEqual(["Creator Workflow"]);
    expect(first.platforms).toEqual(["Meta Ads"]);
    expect(second.apps).toEqual([]);
    expect(second.platforms).toEqual([]);
    expect(first.apps).not.toBe(second.apps);
    expect(first.apps).not.toBe(DEFAULT_FILTERS.apps);
  });
});

describe("filterRecords", () => {
  it("requires every populated category to match", () => {
    const records = [
      baseRecord,
      createRecord("wrong-date", { date: "2026-05-19" }),
      createRecord("wrong-app", { app: "Finance Tracker" }),
      createRecord("wrong-platform", { platform: "Google Ads" }),
      createRecord("wrong-account", {
        account: "Meta Ads Secondary Account",
      }),
      createRecord("wrong-country", { country: "CA" }),
      createRecord("wrong-os", { os: "Android" }),
    ];
    const filters = createFilters({
      dateFrom: "2026-05-20",
      dateTo: "2026-05-20",
      apps: ["Creator Workflow"],
      platforms: ["Meta Ads"],
      accounts: ["Meta Ads Growth Account"],
      countries: ["US"],
      operatingSystems: ["iOS"],
    });

    expect(filterRecords(records, filters)).toEqual([baseRecord]);
  });

  it("includes records on both date boundaries", () => {
    const records = [
      createRecord("from", { date: "2026-05-08" }),
      createRecord("inside", { date: "2026-05-20" }),
      createRecord("to", { date: "2026-06-06" }),
      createRecord("before", { date: "2026-05-07" }),
      createRecord("after", { date: "2026-06-07" }),
    ];

    expect(filterRecords(records, DEFAULT_FILTERS).map(({ id }) => id)).toEqual([
      "from",
      "inside",
      "to",
    ]);
  });

  it("treats empty selection arrays as including every value", () => {
    const records = [
      baseRecord,
      createRecord("other", {
        app: "Finance Tracker",
        platform: "Google Ads",
        account: "Google Ads Growth Account",
        country: "JP",
        os: "Android",
      }),
    ];

    expect(filterRecords(records, DEFAULT_FILTERS)).toEqual(records);
  });

  it("does not mutate the input array or records", () => {
    const records = Object.freeze([
      Object.freeze(baseRecord),
      Object.freeze(createRecord("other", { country: "CA" })),
    ]);
    const snapshot = structuredClone(records);

    const result = filterRecords(
      records,
      createFilters({ countries: ["US"] }),
    );

    expect(records).toEqual(snapshot);
    expect(result).toEqual([baseRecord]);
    expect(result[0]).toBe(records[0]);
  });

  it("returns no matches for a reversed date range", () => {
    const filters = createFilters({
      dateFrom: "2026-06-06",
      dateTo: "2026-05-08",
    });

    expect(filterRecords([baseRecord], filters)).toEqual([]);
  });
});
