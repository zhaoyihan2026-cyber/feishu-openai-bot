import {
  ANOMALY_THRESHOLDS,
  detectBudgetPace,
  detectDataDelay,
  detectMetricChange,
  type Anomaly,
} from "../../domain/anomalies";
import { aggregateMetrics, safeDivide } from "../../domain/metrics";
import type {
  AcquisitionRecord,
  Metrics,
  Platform,
} from "../../domain/types";

const DAY_MS = 86_400_000;

export interface PeriodSplit {
  previous: AcquisitionRecord[];
  current: AcquisitionRecord[];
  previousDates: string[];
  currentDates: string[];
}

export interface DailyPoint {
  date: string;
  spendUsd: number;
  installs: number;
  d7Roas: number;
}

export interface PerformanceSummary {
  spendUsd: number;
  installs: number;
  activations: number;
  payers: number;
  cpi: number;
  activationRate: number;
  d7Roas: number;
}

export interface PlatformSummary extends PerformanceSummary {
  platform: Platform;
}

export interface CountrySummary extends PerformanceSummary {
  country: string;
}

export interface MetricComparison {
  current: number;
  previous: number;
  change: number | null;
  trend: "up" | "down" | "flat" | "new";
}

export interface DashboardComparisons {
  spendUsd: MetricComparison;
  installs: MetricComparison;
  cpi: MetricComparison;
  activationRate: MetricComparison;
  payers: MetricComparison;
  d7Roas: MetricComparison;
  d30Ltv: MetricComparison;
}

export interface DashboardViewModel {
  currentMetrics: Metrics;
  selectedRangeMetrics: Metrics;
  comparisons: DashboardComparisons;
  dailySeries: DailyPoint[];
  platforms: PlatformSummary[];
  countries: CountrySummary[];
  budgetPace: number;
  timePace: number;
  anomalies: PlatformAnomaly[];
}

export type PlatformAnomaly = Anomaly & { scope: Platform };

interface DashboardViewModelOptions {
  dateFrom: string;
  dateTo: string;
  mockAsOfTimestamp: string;
}

function startOfUtcDay(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

function dateRange(dateFrom: string, dateTo: string): string[] {
  const start = startOfUtcDay(dateFrom);
  const end = startOfUtcDay(dateTo);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return [];
  }

  const dates: string[] = [];
  for (let timestamp = start; timestamp <= end; timestamp += DAY_MS) {
    dates.push(new Date(timestamp).toISOString().slice(0, 10));
  }
  return dates;
}

function comparison(current: number, previous: number): MetricComparison {
  if (previous === 0 && current > 0) {
    return {
      current,
      previous,
      change: null,
      trend: "new",
    };
  }

  const change = previous === 0 ? 0 : (current - previous) / previous;
  return {
    current,
    previous,
    change,
    trend: change > 0 ? "up" : change < 0 ? "down" : "flat",
  };
}

function toPerformanceSummary(
  records: readonly AcquisitionRecord[],
): PerformanceSummary {
  const metrics = aggregateMetrics([...records]);
  return {
    spendUsd: metrics.spendUsd,
    installs: metrics.installs,
    activations: metrics.activations,
    payers: metrics.payers,
    cpi: metrics.cpi,
    activationRate: metrics.activationRate,
    d7Roas: metrics.d7Roas,
  };
}

function groupBy<Key extends string>(
  records: readonly AcquisitionRecord[],
  keyForRecord: (record: AcquisitionRecord) => Key,
): Map<Key, AcquisitionRecord[]> {
  const groups = new Map<Key, AcquisitionRecord[]>();

  for (const record of records) {
    const key = keyForRecord(record);
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }

  return groups;
}

export function splitRecordsByMidpoint(
  records: readonly AcquisitionRecord[],
  dateFrom: string,
  dateTo: string,
): PeriodSplit {
  const dates = dateRange(dateFrom, dateTo);
  // A single selected day is the current period; longer odd ranges keep
  // equal comparison halves by excluding the center day.
  const periodLength = dates.length === 1 ? 1 : Math.floor(dates.length / 2);
  const previousDates =
    dates.length === 1 ? [] : dates.slice(0, periodLength);
  const currentDates = dates.slice(dates.length - periodLength);
  const previousDateSet = new Set(previousDates);
  const currentDateSet = new Set(currentDates);
  const sortedRecords = [...records].sort(
    (left, right) =>
      left.date.localeCompare(right.date) || left.id.localeCompare(right.id),
  );

  return {
    previous: sortedRecords.filter(({ date }) => previousDateSet.has(date)),
    current: sortedRecords.filter(({ date }) => currentDateSet.has(date)),
    previousDates,
    currentDates,
  };
}

export function buildDailySeries(
  records: readonly AcquisitionRecord[],
  dateFrom: string,
  dateTo: string,
): DailyPoint[] {
  const recordsByDate = groupBy(records, ({ date }) => date);

  return dateRange(dateFrom, dateTo).map((date) => {
    const metrics = aggregateMetrics(recordsByDate.get(date) ?? []);
    return {
      date,
      spendUsd: metrics.spendUsd,
      installs: metrics.installs,
      d7Roas: metrics.d7Roas,
    };
  });
}

export function calculateBudgetPace(
  records: readonly AcquisitionRecord[],
): number {
  const totals = records.reduce(
    (result, record) => ({
      spend: result.spend + record.spendUsd,
      budget: result.budget + record.budgetUsd,
    }),
    { spend: 0, budget: 0 },
  );
  return safeDivide(totals.spend, totals.budget);
}

export function calculateTimePace(
  dateFrom: string,
  dateTo: string,
  asOfTimestamp: string,
): number {
  const start = startOfUtcDay(dateFrom);
  const intervalEnd = startOfUtcDay(dateTo) + DAY_MS;
  const asOf = Date.parse(asOfTimestamp);

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(intervalEnd) ||
    !Number.isFinite(asOf) ||
    intervalEnd <= start
  ) {
    return 0;
  }

  return Math.min(1, Math.max(0, (asOf - start) / (intervalEnd - start)));
}

export function aggregatePlatforms(
  records: readonly AcquisitionRecord[],
): PlatformSummary[] {
  return [...groupBy(records, ({ platform }) => platform)]
    .map(([platform, platformRecords]) => ({
      platform,
      ...toPerformanceSummary(platformRecords),
    }))
    .sort(
      (left, right) =>
        right.spendUsd - left.spendUsd ||
        left.platform.localeCompare(right.platform),
    );
}

export function aggregateCountries(
  records: readonly AcquisitionRecord[],
): CountrySummary[] {
  return [...groupBy(records, ({ country }) => country)]
    .map(([country, countryRecords]) => ({
      country,
      ...toPerformanceSummary(countryRecords),
    }))
    .sort(
      (left, right) =>
        right.spendUsd - left.spendUsd ||
        left.country.localeCompare(right.country),
    );
}

function latestUpdatedAt(records: readonly AcquisitionRecord[]): string | null {
  return records.reduce<string | null>((latest, { updatedAt }) => {
    if (!latest || Date.parse(updatedAt) > Date.parse(latest)) {
      return updatedAt;
    }
    return latest;
  }, null);
}

function isPlatformAnomaly(
  anomaly: Anomaly | null,
  platform: Platform,
): anomaly is PlatformAnomaly {
  return anomaly?.scope === platform;
}

function buildAnomalies(
  records: readonly AcquisitionRecord[],
  options: DashboardViewModelOptions,
  period: PeriodSplit,
): PlatformAnomaly[] {
  const anomalies = new Map<string, PlatformAnomaly>();
  const now = new Date(options.mockAsOfTimestamp);
  const currentDateFrom = period.currentDates[0];
  const currentDateTo = period.currentDates.at(-1);
  const timePace =
    currentDateFrom && currentDateTo
      ? calculateTimePace(
          currentDateFrom,
          currentDateTo,
          options.mockAsOfTimestamp,
        )
      : 0;
  const previousDateSet = new Set(period.previousDates);
  const currentDateSet = new Set(period.currentDates);

  for (const [platform, platformRecords] of groupBy(
    records,
    ({ platform }) => platform,
  )) {
    const previous = platformRecords.filter(({ date }) =>
      previousDateSet.has(date),
    );
    const current = platformRecords.filter(({ date }) =>
      currentDateSet.has(date),
    );
    const previousMetrics = aggregateMetrics(previous);
    const currentMetrics = aggregateMetrics(current);
    const latestUpdate = latestUpdatedAt(platformRecords);
    const budgetPace = calculateBudgetPace(current);
    const budgetAnomaly =
      detectBudgetPace(budgetPace, timePace, platform) ??
      (Number.isFinite(budgetPace) &&
      budgetPace > 1 &&
      budgetPace - timePace >= ANOMALY_THRESHOLDS.budgetPaceGap
        ? {
            id: `budgetPace:${encodeURIComponent(platform)}`,
            kind: "budgetPace" as const,
            severity: "medium" as const,
            scope: platform,
            currentValue: budgetPace,
            comparisonValue: timePace,
            message: `${platform} Budget Pace 与时间进度偏差 ${(
              (budgetPace - timePace) *
              100
            ).toFixed(1)}%，达到异常阈值。`,
          }
        : null);
    const candidates = [
      detectMetricChange(
        "cpi",
        currentMetrics.cpi,
        previousMetrics.cpi,
        platform,
      ),
      detectMetricChange(
        "d7Roas",
        currentMetrics.d7Roas,
        previousMetrics.d7Roas,
        platform,
      ),
      budgetAnomaly,
      latestUpdate
        ? detectDataDelay(latestUpdate, now, platform)
        : null,
    ];

    for (const anomaly of candidates) {
      if (isPlatformAnomaly(anomaly, platform)) {
        anomalies.set(anomaly.id, anomaly);
      }
    }
  }

  return [...anomalies.values()].sort(
    (left, right) =>
      left.scope.localeCompare(right.scope) ||
      left.kind.localeCompare(right.kind),
  );
}

export function buildDashboardViewModel(
  records: readonly AcquisitionRecord[],
  options: DashboardViewModelOptions,
): DashboardViewModel {
  const selectedRangeMetrics = aggregateMetrics([...records]);
  const period = splitRecordsByMidpoint(
    records,
    options.dateFrom,
    options.dateTo,
  );
  const { previous, current } = period;
  const previousMetrics = aggregateMetrics(previous);
  const currentMetrics = aggregateMetrics(current);
  const currentDateFrom = period.currentDates[0];
  const currentDateTo = period.currentDates.at(-1);

  return {
    currentMetrics,
    selectedRangeMetrics,
    comparisons: {
      spendUsd: comparison(
        currentMetrics.spendUsd,
        previousMetrics.spendUsd,
      ),
      installs: comparison(
        currentMetrics.installs,
        previousMetrics.installs,
      ),
      cpi: comparison(currentMetrics.cpi, previousMetrics.cpi),
      activationRate: comparison(
        currentMetrics.activationRate,
        previousMetrics.activationRate,
      ),
      payers: comparison(currentMetrics.payers, previousMetrics.payers),
      d7Roas: comparison(currentMetrics.d7Roas, previousMetrics.d7Roas),
      d30Ltv: comparison(currentMetrics.d30Ltv, previousMetrics.d30Ltv),
    },
    dailySeries: buildDailySeries(records, options.dateFrom, options.dateTo),
    platforms: aggregatePlatforms(records),
    countries: aggregateCountries(records),
    budgetPace: calculateBudgetPace(current),
    timePace:
      currentDateFrom && currentDateTo
        ? calculateTimePace(
            currentDateFrom,
            currentDateTo,
            options.mockAsOfTimestamp,
          )
        : 0,
    anomalies: buildAnomalies(records, options, period),
  };
}
