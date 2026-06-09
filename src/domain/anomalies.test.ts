import {
  ANOMALY_THRESHOLDS,
  detectBudgetPace,
  detectDataDelay,
  detectMetricChange,
} from "./anomalies";

describe("ANOMALY_THRESHOLDS", () => {
  it("exports the centralized acquisition anomaly thresholds", () => {
    expect(ANOMALY_THRESHOLDS).toEqual({
      cpiIncrease: 0.2,
      d7RoasDecrease: 0.15,
      budgetPaceGap: 0.1,
      dataDelayHours: 24,
    });
  });
});

describe("detectMetricChange", () => {
  it("returns a complete default-scope CPI anomaly for the required example", () => {
    expect(detectMetricChange("cpi", 2.4, 2)).toEqual({
      id: `cpi:${encodeURIComponent("全局")}`,
      kind: "cpi",
      severity: "high",
      scope: "全局",
      currentValue: 2.4,
      comparisonValue: 2,
      message: "全局 CPI 较上一周期上升 20.0%，达到异常阈值。",
    });
  });

  it("returns a complete default-scope D7 ROAS anomaly for the required example", () => {
    expect(detectMetricChange("d7Roas", 0.34, 0.4)).toEqual({
      id: `d7Roas:${encodeURIComponent("全局")}`,
      kind: "d7Roas",
      severity: "high",
      scope: "全局",
      currentValue: 0.34,
      comparisonValue: 0.4,
      message: "全局 D7 ROAS 较上一周期下降 15.0%，达到异常阈值。",
    });
  });

  it("normalizes and encodes a provided scope in stable ids and messages", () => {
    const anomaly = detectMetricChange("cpi", 120, 100, "  Meta Ads / US  ");

    expect(anomaly?.scope).toBe("Meta Ads / US");
    expect(anomaly?.id).toBe(
      `cpi:${encodeURIComponent("Meta Ads / US")}`,
    );
    expect(anomaly?.message).toContain("Meta Ads / US CPI");
  });

  it.each([undefined, "", "   "])(
    "normalizes empty scope %s to the default scope",
    (scope) => {
      expect(detectMetricChange("cpi", 2.4, 2, scope)).toMatchObject({
        id: `cpi:${encodeURIComponent("全局")}`,
        scope: "全局",
        message: expect.stringContaining("全局 CPI"),
      });
    },
  );

  it("encodes scope values without id collisions", () => {
    const slashScope = detectMetricChange("cpi", 2.4, 2, "a/b");
    const encodedTextScope = detectMetricChange("cpi", 2.4, 2, "a%2Fb");

    expect(slashScope?.id).toBe("cpi:a%2Fb");
    expect(encodedTextScope?.id).toBe("cpi:a%252Fb");
    expect(slashScope?.id).not.toBe(encodedTextScope?.id);
  });

  it("uses the exported CPI increase at the exact boundary", () => {
    const previous = 2;
    const boundary = previous * (1 + ANOMALY_THRESHOLDS.cpiIncrease);
    const belowBoundary = boundary - Number.EPSILON;

    expect(belowBoundary).toBeLessThan(boundary);
    expect(detectMetricChange("cpi", boundary, previous)).toMatchObject({
      currentValue: boundary,
      comparisonValue: previous,
    });
    expect(detectMetricChange("cpi", belowBoundary, previous)).toBeNull();
  });

  it("compares CPI decimal literals exactly at the threshold", () => {
    const belowBoundary = 0.10199999999999998;

    expect(belowBoundary).toBeLessThan(0.102);
    expect(detectMetricChange("cpi", 0.102, 0.085)).toMatchObject({
      currentValue: 0.102,
      comparisonValue: 0.085,
    });
    expect(detectMetricChange("cpi", belowBoundary, 0.085)).toBeNull();
  });

  it("uses the exported D7 ROAS decrease at the exact boundary", () => {
    const previous = 0.4;
    const boundary = previous * (1 - ANOMALY_THRESHOLDS.d7RoasDecrease);
    const aboveBoundary = boundary + Number.EPSILON;

    expect(aboveBoundary).toBeGreaterThan(boundary);
    expect(detectMetricChange("d7Roas", boundary, previous)).toMatchObject({
      currentValue: boundary,
      comparisonValue: previous,
    });
    expect(detectMetricChange("d7Roas", aboveBoundary, previous)).toBeNull();
  });

  it("compares D7 ROAS decimal literals exactly at the threshold", () => {
    const aboveBoundary = 0.49300000000000005;

    expect(aboveBoundary).toBeGreaterThan(0.493);
    expect(detectMetricChange("d7Roas", 0.493, 0.58)).toMatchObject({
      currentValue: 0.493,
      comparisonValue: 0.58,
    });
    expect(detectMetricChange("d7Roas", aboveBoundary, 0.58)).toBeNull();
  });

  it("supports scientific notation in exact decimal comparisons", () => {
    const belowBoundary = 1.1999999999999996e-7;

    expect(belowBoundary).toBeLessThan(1.2e-7);
    expect(detectMetricChange("cpi", 1.2e-7, 1e-7)).not.toBeNull();
    expect(detectMetricChange("cpi", belowBoundary, 1e-7)).toBeNull();
  });

  it("ignores metric movement in the non-anomalous direction", () => {
    expect(detectMetricChange("cpi", 1.5, 2)).toBeNull();
    expect(detectMetricChange("d7Roas", 0.5, 0.4)).toBeNull();
  });

  it.each([
    ["zero previous", "cpi", 2.4, 0],
    ["negative previous", "d7Roas", 0.34, -0.4],
    ["negative CPI current", "cpi", -2.4, 2],
    ["negative D7 ROAS current", "d7Roas", -0.34, 0.4],
    ["NaN current", "cpi", Number.NaN, 2],
    ["infinite current", "d7Roas", Number.POSITIVE_INFINITY, 0.4],
    ["NaN previous", "cpi", 2.4, Number.NaN],
    ["infinite previous", "d7Roas", 0.34, Number.NEGATIVE_INFINITY],
  ] as const)("returns null for %s", (_label, metric, current, previous) => {
    expect(detectMetricChange(metric, current, previous)).toBeNull();
  });
});

describe("detectBudgetPace", () => {
  it("returns a complete default-scope anomaly for the required example", () => {
    expect(detectBudgetPace(0.65, 0.5)).toEqual({
      id: `budgetPace:${encodeURIComponent("全局")}`,
      kind: "budgetPace",
      severity: "high",
      scope: "全局",
      currentValue: 0.65,
      comparisonValue: 0.5,
      message: "全局 Budget Pace 与时间进度偏差 15.0%，达到异常阈值。",
    });
  });

  it("uses the exported budget pace gap at the exact boundary", () => {
    const timePace = 0.5;
    const boundary = timePace + ANOMALY_THRESHOLDS.budgetPaceGap;
    const belowBoundary = boundary - Number.EPSILON;

    expect(belowBoundary).toBeLessThan(boundary);
    expect(detectBudgetPace(boundary, timePace)).toMatchObject({
      currentValue: boundary,
      comparisonValue: timePace,
    });
    expect(detectBudgetPace(belowBoundary, timePace)).toBeNull();
  });

  it("compares budget pace decimal literals exactly at the threshold", () => {
    const belowBoundary = 0.2999999999999999;

    expect(belowBoundary - 0.2).toBeLessThan(0.1);
    expect(detectBudgetPace(0.3, 0.2)).toMatchObject({
      currentValue: 0.3,
      comparisonValue: 0.2,
    });
    expect(detectBudgetPace(belowBoundary, 0.2)).toBeNull();
  });

  it("does not trigger when budget pace trails time pace", () => {
    expect(detectBudgetPace(0.4, 0.5)).toBeNull();
  });

  it.each([
    ["negative budget pace", -0.1, 0.5],
    ["budget pace over one", 1.1, 0.5],
    ["negative time pace", 0.5, -0.1],
    ["time pace over one", 0.5, 1.1],
    ["NaN budget pace", Number.NaN, 0.5],
    ["infinite time pace", 0.5, Number.POSITIVE_INFINITY],
  ])("returns null for %s", (_label, budgetPace, timePace) => {
    expect(detectBudgetPace(budgetPace, timePace)).toBeNull();
  });
});

describe("detectDataDelay", () => {
  it("returns a complete default-scope anomaly for the required example", () => {
    const anomaly = detectDataDelay(
      "2026-06-04T00:00:00Z",
      new Date("2026-06-06T00:00:01Z"),
    );

    expect(anomaly).toMatchObject({
      id: `dataDelay:${encodeURIComponent("全局")}`,
      kind: "dataDelay",
      severity: "high",
      scope: "全局",
      comparisonValue: 24,
      message: "全局 Data Delay 已超过 24 小时阈值。",
    });
    expect(anomaly?.currentValue).toBeCloseTo(48.000277777777775, 10);
  });

  it("does not trigger at exactly 24 hours but triggers one millisecond later", () => {
    const updatedAt = "2026-06-04T00:00:00.000Z";
    const delayed = detectDataDelay(
      updatedAt,
      new Date("2026-06-05T00:00:00.001Z"),
    );

    expect(
      detectDataDelay(updatedAt, new Date("2026-06-05T00:00:00.000Z")),
    ).toBeNull();
    expect(delayed).toMatchObject({
      message: "全局 Data Delay 已超过 24 小时阈值。",
      comparisonValue: 24,
    });
    expect(delayed?.currentValue).toBeCloseTo(24 + 1 / 3_600_000, 12);
    expect(delayed?.message).not.toContain("24.0");
  });

  it("returns null for invalid, future, or invalid-now timestamps", () => {
    expect(detectDataDelay("not-a-date", new Date())).toBeNull();
    expect(
      detectDataDelay(
        "2026-06-06T00:00:01Z",
        new Date("2026-06-06T00:00:00Z"),
      ),
    ).toBeNull();
    expect(
      detectDataDelay("2026-06-04T00:00:00Z", new Date("not-a-date")),
    ).toBeNull();
  });
});
