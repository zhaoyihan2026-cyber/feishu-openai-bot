import type { Metrics } from "../../domain/types";
import {
  buildDashboardChartAriaLabels,
  buildDashboardChartOptions,
  buildDashboardKpis,
  formatAnomalyValues,
  type DashboardChartInput,
} from "./dashboardPresentation";
import type {
  DashboardComparisons,
  MetricComparison,
} from "./dashboardViewModel";

const metrics: Metrics = {
  impressions: 10_000,
  clicks: 800,
  installs: 1_234,
  activations: 740,
  payers: 98,
  spendUsd: 12_345.67,
  revenueD7Usd: 7_407.4,
  revenueD30Usd: 22_050,
  ctr: 0.08,
  cpi: 10.0046,
  activationRate: 0.5997,
  payerRate: 0.0794,
  d7Roas: 0.6,
  d30Ltv: 225,
  d0Roas: 0.6,
  arppu: 75.59,
  paymentRate: 0.0794,
  installRate: 0.1234,
  cvr: 1.5425,
  installRegistrationRate: 0.5997,
  cpm: 1234.57,
  cpc: 15.43,
  ipm: 123.4,
  cpr: 16.68,
  cpp: 125.98,
  d1RetentionRate: 0.34,
  d7RetentionRate: 0.21,
};

const comparison = (
  current: number,
  previous: number,
  change: number | null,
  trend: MetricComparison["trend"] = "up",
): MetricComparison => ({ current, previous, change, trend });

const comparisons: DashboardComparisons = {
  spendUsd: comparison(7_000, 5_000, 0.4),
  installs: comparison(700, 534, 0.31),
  cpi: comparison(10, 9, 0.11),
  activationRate: comparison(0.6, 0.58, 0.034),
  payers: comparison(55, 43, 0.279),
  d7Roas: comparison(0.6, 0.7, -0.143),
  d30Ltv: comparison(225, 210, 0.071),
  d0Roas: comparison(0.6, 0.7, -0.143),
  cpr: comparison(16.68, 14, 0.191),
  cpp: comparison(125.98, 110, 0.145),
  d1RetentionRate: comparison(0.34, 0.31, 0.097),
  d7RetentionRate: comparison(0.21, 0.2, 0.05),
};

describe("dashboard presentation", () => {
  it("formats KPI values and assigns direction-aware statuses", () => {
    const kpis = buildDashboardKpis(metrics, comparisons);

    expect(kpis.map(({ value }) => value)).toEqual([
      "$12,345.67",
      "1,234",
      "$10.00",
      "60.0%",
      "98",
      "60.0%",
      "$225.00",
      "60.0%",
      "$16.68",
      "$125.98",
      "34.0%",
      "21.0%",
    ]);
    expect(kpis.map(({ status }) => status)).toEqual([
      "neutral",
      "positive",
      "negative",
      "positive",
      "positive",
      "negative",
      "positive",
      "negative",
      "negative",
      "negative",
      "positive",
      "positive",
    ]);
    expect(kpis[0].comparison).toBe("较上期 +40.0%");
    expect(kpis[5].comparison).toBe("较上期 -14.3%");
  });

  it("renders new activity honestly and normalizes changes that format to zero", () => {
    const newActivity: DashboardComparisons = {
      ...comparisons,
      spendUsd: comparison(20, 0, null, "new"),
      installs: comparison(10, 0, null, "new"),
      payers: comparison(2, 0, null, "new"),
      d7Roas: comparison(0.6, 0.6002, -0.000333, "down"),
    };

    const kpis = buildDashboardKpis(
      {
        ...metrics,
        spendUsd: 20,
        installs: 10,
        payers: 2,
      },
      newActivity,
    );

    expect(kpis[0]).toMatchObject({
      comparison: "较上期 新增",
      status: "warning",
    });
    expect(kpis[1]).toMatchObject({
      comparison: "较上期 新增",
      status: "positive",
    });
    expect(kpis[4]).toMatchObject({
      comparison: "较上期 新增",
      status: "positive",
    });
    expect(kpis[5]).toMatchObject({
      comparison: "较上期 0.0%",
      status: "neutral",
    });
  });

  it.each([
    ["positive boundary", 0.0005, "较上期 +0.1%"],
    ["negative boundary", -0.0005, "较上期 -0.1%"],
    ["positive inside threshold", 0.0004999, "较上期 0.0%"],
    ["negative inside threshold", -0.0004999, "较上期 0.0%"],
  ])("formats %s symmetrically", (_label, change, expected) => {
    const boundaryComparisons: DashboardComparisons = {
      ...comparisons,
      d7Roas: comparison(
        1 + change,
        1,
        change,
        change > 0 ? "up" : "down",
      ),
    };

    expect(buildDashboardKpis(metrics, boundaryComparisons)[5].comparison).toBe(
      expected,
    );
  });

  it("builds nonblank accessible chart series and concise aria summaries", () => {
    const input: DashboardChartInput = {
      dailySeries: [
        {
          date: "2026-06-01",
          spendUsd: 100,
          installs: 25,
          d7Roas: 0.55,
        },
        {
          date: "2026-06-02",
          spendUsd: 120,
          installs: 30,
          d7Roas: 0.6,
        },
      ],
      platforms: [
        {
          platform: "Meta Ads",
          spendUsd: 220,
          installs: 55,
          activations: 30,
          payers: 6,
          cpi: 4,
          activationRate: 30 / 55,
          d7Roas: 0.58,
        },
      ],
      countries: [
        {
          country: "US",
          spendUsd: 220,
          installs: 55,
          activations: 30,
          payers: 6,
          cpi: 4,
          activationRate: 30 / 55,
          d7Roas: 0.58,
        },
      ],
    };
    const options = buildDashboardChartOptions(input);
    const labels = buildDashboardChartAriaLabels(input);

    for (const option of Object.values(options)) {
      expect(option.series).toBeTruthy();
      expect(option.aria).toMatchObject({
        enabled: true,
        description: expect.any(String),
      });
      expect(JSON.stringify(option)).not.toContain("LinearGradient");
      expect(JSON.stringify(option)).not.toContain("RadialGradient");
    }
    expect(JSON.stringify(options.spendAndInstalls)).toContain("100");
    expect(JSON.stringify(options.d7Roas)).toContain("0.55");
    expect(JSON.stringify(options.platformMix)).toContain("Meta Ads");
    expect(JSON.stringify(options.countryMap)).toContain("US");
    expect(labels.spendAndInstalls).toContain("2026-06-01 至 2026-06-02");
    expect(labels.spendAndInstalls).toContain("总花费 $220.00");
    expect(labels.spendAndInstalls).toContain("总安装 55");
    expect(labels.d7Roas).toContain("最新 60.0%");
    expect(labels.platformMix).toContain("Meta Ads $220.00");
    expect(labels.countryMap).toContain("US $220.00");
    expect(labels.spendAndInstalls.length).toBeLessThan(140);
  });

  it("formats anomaly current and comparison values by kind", () => {
    expect(
      formatAnomalyValues({
        id: "cpi:Meta",
        kind: "cpi",
        severity: "high",
        scope: "Meta Ads",
        currentValue: 3.38,
        comparisonValue: 2.6,
        message: "CPI alert",
      }),
    ).toEqual({
      currentLabel: "当前 CPI",
      currentValue: "$3.38",
      comparisonLabel: "上期 CPI",
      comparisonValue: "$2.60",
    });
    expect(
      formatAnomalyValues({
        id: "budget:Microsoft",
        kind: "budgetPace",
        severity: "medium",
        scope: "Microsoft Ads",
        currentValue: 1.18,
        comparisonValue: 1,
        message: "Budget alert",
      }),
    ).toMatchObject({
      currentLabel: "当前预算进度",
      currentValue: "118.0%",
      comparisonLabel: "当前时间进度",
      comparisonValue: "100.0%",
    });
    expect(
      formatAnomalyValues({
        id: "delay:LinkedIn",
        kind: "dataDelay",
        severity: "high",
        scope: "LinkedIn Ads",
        currentValue: 52,
        comparisonValue: 24,
        message: "Delay alert",
      }),
    ).toMatchObject({
      currentValue: "52.0 小时",
      comparisonValue: "24.0 小时",
    });
  });
});
