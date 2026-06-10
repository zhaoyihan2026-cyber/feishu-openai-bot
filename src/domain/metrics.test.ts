import { aggregateMetrics, safeDivide } from "./metrics";

const baseRecord = {
  id: "record-1",
  date: "2026-06-01",
  updatedAt: "2026-06-01T12:00:00Z",
  app: "Example App",
  platform: "Meta Ads" as const,
  account: "Primary Account",
  country: "US",
  os: "iOS" as const,
  campaign: "Launch",
  adGroup: "Broad",
  creative: "Demo Video",
  creativeType: "Video" as const,
  thumbnail: "https://example.com/thumbnail.jpg",
  impressions: 0,
  clicks: 0,
  installs: 0,
  activations: 0,
  payers: 0,
  spendUsd: 0,
  revenueD7Usd: 0,
  revenueD30Usd: 0,
  budgetUsd: 0,
};

function createRecord(overrides: Partial<typeof baseRecord> = {}) {
  return { ...baseRecord, ...overrides };
}

describe("safeDivide", () => {
  it("returns zero for positive and negative zero denominators", () => {
    expect(safeDivide(10, 0)).toBe(0);
    expect(safeDivide(10, -0)).toBe(0);
  });

  it("divides normally when the denominator is nonzero", () => {
    expect(safeDivide(10, 4)).toBe(2.5);
  });
});

describe("aggregateMetrics", () => {
  it("aggregates totals before calculating acquisition ratios", () => {
    const metrics = aggregateMetrics([
      createRecord({
        impressions: 1_000,
        clicks: 100,
        installs: 20,
        activations: 12,
        payers: 2,
        spendUsd: 40,
        revenueD7Usd: 20,
        revenueD30Usd: 50,
      }),
      createRecord({
        id: "record-2",
        impressions: 500,
        clicks: 50,
        installs: 10,
        activations: 6,
        payers: 1,
        spendUsd: 20,
        revenueD7Usd: 10,
        revenueD30Usd: 25,
      }),
    ]);

    expect(metrics).toEqual({
      impressions: 1_500,
      clicks: 150,
      installs: 30,
      activations: 18,
      payers: 3,
      spendUsd: 60,
      revenueD7Usd: 30,
      revenueD30Usd: 75,
      ctr: 0.1,
      cpi: 2,
      activationRate: 0.6,
      payerRate: 0.1,
      d7Roas: 0.5,
      d30Ltv: 25,
      d0Roas: 0.5,
      arppu: 10,
      paymentRate: 0.1,
      installRate: 0.02,
      cvr: 0.2,
      installRegistrationRate: 0.6,
      cpm: 40,
      cpc: 0.4,
      ipm: 20,
      cpr: 60 / 18,
      cpp: 20,
      d1RetentionRate: 0,
      d7RetentionRate: 0,
    });
  });

  it("returns finite zeros for empty input", () => {
    const metrics = aggregateMetrics([]);

    expect(metrics).toEqual({
      impressions: 0,
      clicks: 0,
      installs: 0,
      activations: 0,
      payers: 0,
      spendUsd: 0,
      revenueD7Usd: 0,
      revenueD30Usd: 0,
      ctr: 0,
      cpi: 0,
      activationRate: 0,
      payerRate: 0,
      d7Roas: 0,
      d30Ltv: 0,
      d0Roas: 0,
      arppu: 0,
      paymentRate: 0,
      installRate: 0,
      cvr: 0,
      installRegistrationRate: 0,
      cpm: 0,
      cpc: 0,
      ipm: 0,
      cpr: 0,
      cpp: 0,
      d1RetentionRate: 0,
      d7RetentionRate: 0,
    });
    expect(Object.values(metrics).every(Number.isFinite)).toBe(true);
  });

  it("derives agency report metrics from aggregate totals and weighted retention", () => {
    const metrics = aggregateMetrics([
      createRecord({
        impressions: 1_000,
        clicks: 100,
        installs: 10,
        activations: 4,
        payers: 1,
        spendUsd: 100,
        revenueD7Usd: 40,
        d1RetentionRate: 0.2,
        d7RetentionRate: 0.1,
      }),
      createRecord({
        id: "record-2",
        impressions: 2_000,
        clicks: 200,
        installs: 20,
        activations: 12,
        payers: 2,
        spendUsd: 200,
        revenueD7Usd: 110,
        d1RetentionRate: 0.4,
        d7RetentionRate: 0.3,
      }),
    ]);

    expect(metrics.d0Roas).toBeCloseTo(150 / 300);
    expect(metrics.arppu).toBeCloseTo(150 / 3);
    expect(metrics.paymentRate).toBeCloseTo(3 / 30);
    expect(metrics.installRate).toBeCloseTo(30 / 3_000);
    expect(metrics.cvr).toBeCloseTo(30 / 300);
    expect(metrics.installRegistrationRate).toBeCloseTo(16 / 30);
    expect(metrics.cpm).toBeCloseTo((300 / 3_000) * 1_000);
    expect(metrics.cpc).toBeCloseTo(300 / 300);
    expect(metrics.ipm).toBeCloseTo((30 / 3_000) * 1_000);
    expect(metrics.cpr).toBeCloseTo(300 / 16);
    expect(metrics.cpp).toBeCloseTo(300 / 3);
    expect(metrics.d1RetentionRate).toBeCloseTo(
      (0.2 * 10 + 0.4 * 20) / 30,
    );
    expect(metrics.d7RetentionRate).toBeCloseTo(
      (0.1 * 10 + 0.3 * 20) / 30,
    );
  });

  it.each([
    ["cpi", { spendUsd: 10, installs: 0 }],
    ["d7Roas", { revenueD7Usd: 10, spendUsd: 0 }],
    ["d30Ltv", { revenueD30Usd: 10, payers: 0 }],
    ["ctr", { clicks: 10, impressions: 0 }],
  ] as const)(
    "returns a finite zero for %s when its denominator is zero",
    (metricName, record) => {
      const metrics = aggregateMetrics([createRecord(record)]);

      expect(metrics[metricName]).toBe(0);
      expect(Number.isFinite(metrics[metricName])).toBe(true);
    },
  );
});
