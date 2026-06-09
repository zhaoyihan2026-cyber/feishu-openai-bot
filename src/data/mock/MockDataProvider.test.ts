import { aggregateMetrics } from "../../domain/metrics";
import type { AcquisitionRecord } from "../../domain/types";
import { MockDataProvider } from "./MockDataProvider";
import { MOCK_DATA_AS_OF, mockRecords } from "./records";

const PREVIOUS_PERIOD = {
  start: "2026-05-08",
  end: "2026-05-22",
};
const CURRENT_PERIOD = {
  start: "2026-05-23",
  end: "2026-06-06",
};
const SCENARIO_AS_OF = Date.parse("2026-06-06T00:00:00Z");
const DAY_MS = 86_400_000;
const PLATFORMS: AcquisitionRecord["platform"][] = [
  "Meta Ads",
  "Google Ads",
  "TikTok Ads",
  "Microsoft Ads",
  "LinkedIn Ads",
  "X Ads",
];

function recordsFor(
  platform: AcquisitionRecord["platform"],
  period: typeof PREVIOUS_PERIOD,
) {
  return mockRecords.filter(
    (record) =>
      record.platform === platform &&
      record.date >= period.start &&
      record.date <= period.end,
  );
}

function groupRecordsBy(
  getKey: (record: AcquisitionRecord) => string,
): Map<string, AcquisitionRecord[]> {
  const groups = new Map<string, AcquisitionRecord[]>();

  for (const record of mockRecords) {
    const key = getKey(record);
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }

  return groups;
}

describe("mockRecords", () => {
  it("provides deterministic, complete acquisition coverage", () => {
    expect(mockRecords).toHaveLength(180);
    expect(new Set(mockRecords.map((record) => record.id)).size).toBe(180);
    expect(mockRecords[0]).toMatchObject({
      id: "2026-05-08-meta",
      date: "2026-05-08",
      platform: "Meta Ads",
      app: "Creator Workflow",
      os: "iOS",
    });
    expect(mockRecords.at(-1)).toMatchObject({
      id: "2026-06-06-x",
      date: "2026-06-06",
      platform: "X Ads",
    });

    expect(new Set(mockRecords.map((record) => record.platform))).toEqual(
      new Set(PLATFORMS),
    );
    expect(new Set(mockRecords.map((record) => record.app))).toEqual(
      new Set(["Creator Workflow", "Finance Tracker", "Wellness Routine"]),
    );
    expect(new Set(mockRecords.map((record) => record.country))).toEqual(
      new Set(["US", "CA", "GB", "DE", "JP", "BR"]),
    );
    expect(new Set(mockRecords.map((record) => record.os))).toEqual(
      new Set(["iOS", "Android"]),
    );
    expect(new Set(mockRecords.map((record) => record.creativeType))).toEqual(
      new Set(["Video", "Image", "Playable"]),
    );
    expect(new Set(mockRecords.map((record) => record.thumbnail))).toEqual(
      new Set([
        "/creative-thumbnails/creator-workflow.webp",
        "/creative-thumbnails/finance-tracker.webp",
        "/creative-thumbnails/wellness-routine.webp",
      ]),
    );

    const dates = mockRecords.map((record) => record.date).sort();
    expect(dates[0]).toBe("2026-05-08");
    expect(dates.at(-1)).toBe("2026-06-06");
    expect(
      (Date.parse(`${dates.at(-1)}T00:00:00Z`) -
        Date.parse(`${dates[0]}T00:00:00Z`)) /
        DAY_MS,
    ).toBe(29);

    for (const record of mockRecords) {
      expect([
        record.id,
        record.date,
        record.updatedAt,
        record.app,
        record.platform,
        record.account,
        record.country,
        record.os,
        record.campaign,
        record.adGroup,
        record.creative,
        record.creativeType,
        record.thumbnail,
      ]).not.toContain("");
      expect(
        [
          record.impressions,
          record.clicks,
          record.installs,
          record.activations,
          record.payers,
          record.spendUsd,
          record.revenueD7Usd,
          record.revenueD30Usd,
          record.budgetUsd,
        ].every((value) => Number.isFinite(value) && value >= 0),
      ).toBe(true);
    }
  });

  it("includes every platform on every day in the 30-day span", () => {
    const recordsByDate = groupRecordsBy((record) => record.date);

    expect(recordsByDate.size).toBe(30);
    for (const records of recordsByDate.values()) {
      expect(records).toHaveLength(PLATFORMS.length);
      expect(new Set(records.map((record) => record.platform))).toEqual(
        new Set(PLATFORMS),
      );
    }
  });

  it("rotates apps, operating systems, and countries for every platform", () => {
    const recordsByPlatform = groupRecordsBy((record) => record.platform);

    for (const records of recordsByPlatform.values()) {
      expect(new Set(records.map((record) => record.app))).toEqual(
        new Set(["Creator Workflow", "Finance Tracker", "Wellness Routine"]),
      );
      expect(new Set(records.map((record) => record.os))).toEqual(
        new Set(["iOS", "Android"]),
      );
      expect(new Set(records.map((record) => record.country))).toEqual(
        new Set(["US", "CA", "GB", "DE", "JP", "BR"]),
      );
    }
  });

  it("keeps country and ad group labels consistent", () => {
    for (const record of mockRecords) {
      expect(record.adGroup).toBe(`${record.country} ${record.os}`);
    }
  });

  it("keeps campaign identity stable for each platform and app", () => {
    const recordsByPlatformApp = groupRecordsBy(
      (record) => `${record.platform}|${record.app}`,
    );

    expect(recordsByPlatformApp.size).toBe(PLATFORMS.length * 3);
    for (const records of recordsByPlatformApp.values()) {
      expect(new Set(records.map((record) => record.campaign)).size).toBe(1);
      expect(new Set(records.map((record) => record.date)).size).toBeGreaterThan(
        1,
      );
      expect(
        records.some((record) => record.date <= PREVIOUS_PERIOD.end),
      ).toBe(true);
      expect(
        records.some((record) => record.date >= CURRENT_PERIOD.start),
      ).toBe(true);
    }
  });

  it("keeps each creative scoped to one acquisition identity", () => {
    const recordsByCreative = groupRecordsBy((record) => record.creative);

    for (const records of recordsByCreative.values()) {
      expect(new Set(records.map((record) => record.platform)).size).toBe(1);
      expect(new Set(records.map((record) => record.app)).size).toBe(1);
      expect(new Set(records.map((record) => record.creativeType)).size).toBe(1);
      expect(new Set(records.map((record) => record.campaign)).size).toBe(1);
      expect(new Set(records.map((record) => record.adGroup)).size).toBe(1);
    }
  });

  it("supports excellent, poor, and watch creative status groups", () => {
    const statuses = new Set(
      [...groupRecordsBy((record) => record.creative).values()].map(
        (records) => {
          const metrics = aggregateMetrics(records);

          if (metrics.d7Roas >= 0.5 && metrics.cpi <= 2.5) {
            return "优秀";
          }
          if (metrics.d7Roas < 0.3 || metrics.cpi > 3.5) {
            return "较差";
          }
          return "观察";
        },
      ),
    );

    expect(statuses).toEqual(new Set(["优秀", "较差", "观察"]));
  });

  it("shows Meta current-period CPI at least 25 percent above the previous period", () => {
    const previous = aggregateMetrics(recordsFor("Meta Ads", PREVIOUS_PERIOD));
    const current = aggregateMetrics(recordsFor("Meta Ads", CURRENT_PERIOD));

    expect(current.cpi).toBeGreaterThanOrEqual(previous.cpi * 1.25);
  });

  it("shows TikTok current D7 ROAS at least 20 percent below the previous period", () => {
    const previous = aggregateMetrics(recordsFor("TikTok Ads", PREVIOUS_PERIOD));
    const current = aggregateMetrics(recordsFor("TikTok Ads", CURRENT_PERIOD));

    expect(current.d7Roas).toBeLessThanOrEqual(previous.d7Roas * 0.8);
  });

  it("shows Microsoft current budget pace 15 percentage points above time pace", () => {
    const microsoft = recordsFor("Microsoft Ads", CURRENT_PERIOD);
    const spend = microsoft.reduce((sum, record) => sum + record.spendUsd, 0);
    const budget = microsoft.reduce((sum, record) => sum + record.budgetUsd, 0);
    const elapsedDays =
      (SCENARIO_AS_OF - Date.parse(`${CURRENT_PERIOD.start}T00:00:00Z`)) /
        86_400_000 +
      1;
    const totalDays =
      (Date.parse(`${CURRENT_PERIOD.end}T00:00:00Z`) -
        Date.parse(`${CURRENT_PERIOD.start}T00:00:00Z`)) /
        86_400_000 +
      1;
    const timePace = elapsedDays / totalDays;
    const budgetPace = spend / budget;

    expect(budgetPace - timePace).toBeGreaterThanOrEqual(0.15);
  });

  it("marks only LinkedIn stale relative to the mock snapshot timestamp", () => {
    const mockDataAsOf = Date.parse(MOCK_DATA_AS_OF);
    const stalePlatforms = new Set(
      mockRecords
        .filter(
          (record) =>
            mockDataAsOf - Date.parse(record.updatedAt) > 24 * 60 * 60 * 1_000,
        )
        .map((record) => record.platform),
    );

    expect(stalePlatforms).toEqual(new Set(["LinkedIn Ads"]));
    for (const record of mockRecords) {
      const ageMs = mockDataAsOf - Date.parse(record.updatedAt);
      expect(ageMs).toBeGreaterThanOrEqual(0);
      expect(ageMs > DAY_MS).toBe(record.platform === "LinkedIn Ads");
    }
  });
});

describe("MockDataProvider", () => {
  it("returns clone-isolated records on every call", async () => {
    const provider = new MockDataProvider();
    const first = await provider.getRecords();
    const second = await provider.getRecords();

    expect(first).toEqual(mockRecords);
    expect(second).toEqual(mockRecords);
    expect(first).not.toBe(second);
    expect(first[0]).not.toBe(second[0]);

    first[0].campaign = "Mutated campaign";
    first.pop();

    expect(second).toEqual(mockRecords);
    expect(mockRecords).toHaveLength(180);
    expect(mockRecords[0].campaign).not.toBe("Mutated campaign");
  });
});
