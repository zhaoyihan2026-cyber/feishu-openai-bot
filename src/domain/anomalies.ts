export const ANOMALY_THRESHOLDS = {
  cpiIncrease: 0.2,
  d7RoasDecrease: 0.15,
  budgetPaceGap: 0.1,
  dataDelayHours: 24,
} as const;

export type AnomalyKind = "cpi" | "d7Roas" | "budgetPace" | "dataDelay";

export type AnomalySeverity = "high" | "medium";

export interface Anomaly {
  id: string;
  kind: AnomalyKind;
  severity: AnomalySeverity;
  scope: string;
  currentValue: number;
  comparisonValue: number;
  message: string;
}

const DEFAULT_SCOPE = "全局";
const MILLISECONDS_PER_HOUR = 60 * 60 * 1_000;

interface DecimalRational {
  coefficient: bigint;
  scale: number;
}

// Number#toString exposes the canonical decimal value supplied by callers.
// Keeping that coefficient and scale as integers avoids binary threshold drift.
function toDecimalRational(value: number): DecimalRational {
  const [mantissa, exponentText = "0"] = value.toString().split("e");
  const [whole, fraction = ""] = mantissa.split(".");
  let coefficient = BigInt(`${whole}${fraction}`);
  let scale = fraction.length - Number(exponentText);

  if (scale < 0) {
    coefficient *= 10n ** BigInt(-scale);
    scale = 0;
  }

  while (scale > 0 && coefficient !== 0n && coefficient % 10n === 0n) {
    coefficient /= 10n;
    scale -= 1;
  }

  return { coefficient, scale };
}

function deriveRelativeComparisonFactors(
  threshold: number,
  direction: "increase" | "decrease",
): readonly [currentFactor: bigint, previousFactor: bigint] {
  const thresholdValue = toDecimalRational(threshold);
  const unit = 10n ** BigInt(thresholdValue.scale);
  const previousFactor =
    direction === "increase"
      ? unit + thresholdValue.coefficient
      : unit - thresholdValue.coefficient;

  return [unit, previousFactor];
}

const [CPI_CURRENT_FACTOR, CPI_PREVIOUS_FACTOR] =
  deriveRelativeComparisonFactors(ANOMALY_THRESHOLDS.cpiIncrease, "increase");
const [D7_ROAS_CURRENT_FACTOR, D7_ROAS_PREVIOUS_FACTOR] =
  deriveRelativeComparisonFactors(
    ANOMALY_THRESHOLDS.d7RoasDecrease,
    "decrease",
  );
const BUDGET_PACE_GAP = toDecimalRational(
  ANOMALY_THRESHOLDS.budgetPaceGap,
);

function scaledCoefficient(
  value: DecimalRational,
  targetScale: number,
): bigint {
  return value.coefficient * 10n ** BigInt(targetScale - value.scale);
}

function compareDecimalProducts(
  left: number,
  leftFactor: bigint,
  right: number,
  rightFactor: bigint,
): number {
  const leftValue = toDecimalRational(left);
  const rightValue = toDecimalRational(right);
  const targetScale = Math.max(leftValue.scale, rightValue.scale);
  const scaledLeft =
    scaledCoefficient(leftValue, targetScale) * leftFactor;
  const scaledRight =
    scaledCoefficient(rightValue, targetScale) * rightFactor;

  return scaledLeft < scaledRight ? -1 : scaledLeft > scaledRight ? 1 : 0;
}

function decimalDifferenceAtLeast(
  minuend: number,
  subtrahend: number,
  minimumDifference: DecimalRational,
): boolean {
  const leftValue = toDecimalRational(minuend);
  const rightValue = toDecimalRational(subtrahend);
  const targetScale = Math.max(
    leftValue.scale,
    rightValue.scale,
    minimumDifference.scale,
  );
  const difference =
    scaledCoefficient(leftValue, targetScale) -
    scaledCoefficient(rightValue, targetScale);
  const threshold = scaledCoefficient(minimumDifference, targetScale);

  return difference >= threshold;
}

function normalizeScope(scope?: string): string {
  return scope?.trim() || DEFAULT_SCOPE;
}

function createAnomaly(
  kind: AnomalyKind,
  scope: string | undefined,
  currentValue: number,
  comparisonValue: number,
  message: (resolvedScope: string) => string,
): Anomaly {
  const resolvedScope = normalizeScope(scope);

  return {
    id: `${kind}:${encodeURIComponent(resolvedScope)}`,
    kind,
    severity: "high",
    scope: resolvedScope,
    currentValue,
    comparisonValue,
    message: message(resolvedScope),
  };
}

export function detectMetricChange(
  metric: "cpi" | "d7Roas",
  current: number,
  previous: number,
  scope?: string,
): Anomaly | null {
  if (
    !Number.isFinite(current) ||
    !Number.isFinite(previous) ||
    current < 0 ||
    previous <= 0
  ) {
    return null;
  }

  if (metric === "cpi") {
    if (
      compareDecimalProducts(
        current,
        CPI_CURRENT_FACTOR,
        previous,
        CPI_PREVIOUS_FACTOR,
      ) < 0
    ) {
      return null;
    }

    const increase = (current - previous) / previous;
    return createAnomaly("cpi", scope, current, previous, (resolvedScope) => {
      return `${resolvedScope} CPI 较上一周期上升 ${(increase * 100).toFixed(1)}%，达到异常阈值。`;
    });
  }

  if (
    compareDecimalProducts(
      current,
      D7_ROAS_CURRENT_FACTOR,
      previous,
      D7_ROAS_PREVIOUS_FACTOR,
    ) > 0
  ) {
    return null;
  }

  const decrease = (previous - current) / previous;
  return createAnomaly("d7Roas", scope, current, previous, (resolvedScope) => {
    return `${resolvedScope} D7 ROAS 较上一周期下降 ${(decrease * 100).toFixed(1)}%，达到异常阈值。`;
  });
}

export function detectBudgetPace(
  budgetPace: number,
  timePace: number,
  scope?: string,
): Anomaly | null {
  const valuesAreValid =
    Number.isFinite(budgetPace) &&
    Number.isFinite(timePace) &&
    budgetPace >= 0 &&
    budgetPace <= 1 &&
    timePace >= 0 &&
    timePace <= 1;

  if (!valuesAreValid) {
    return null;
  }

  if (!decimalDifferenceAtLeast(budgetPace, timePace, BUDGET_PACE_GAP)) {
    return null;
  }

  const gap = budgetPace - timePace;
  return createAnomaly(
    "budgetPace",
    scope,
    budgetPace,
    timePace,
    (resolvedScope) => {
      return `${resolvedScope} Budget Pace 与时间进度偏差 ${(gap * 100).toFixed(1)}%，达到异常阈值。`;
    },
  );
}

export function detectDataDelay(
  updatedAt: string,
  now: Date,
  scope?: string,
): Anomaly | null {
  const updatedAtMilliseconds = Date.parse(updatedAt);
  const nowMilliseconds = now.getTime();

  if (
    !Number.isFinite(updatedAtMilliseconds) ||
    !Number.isFinite(nowMilliseconds) ||
    updatedAtMilliseconds > nowMilliseconds
  ) {
    return null;
  }

  const ageHours =
    (nowMilliseconds - updatedAtMilliseconds) / MILLISECONDS_PER_HOUR;
  if (ageHours <= ANOMALY_THRESHOLDS.dataDelayHours) {
    return null;
  }

  return createAnomaly(
    "dataDelay",
    scope,
    ageHours,
    ANOMALY_THRESHOLDS.dataDelayHours,
    (resolvedScope) => {
      return `${resolvedScope} Data Delay 已超过 ${ANOMALY_THRESHOLDS.dataDelayHours} 小时阈值。`;
    },
  );
}
