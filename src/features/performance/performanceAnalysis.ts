import type { ReadonlyFilterState } from "../../domain/filters";
import { aggregateMetrics } from "../../domain/metrics";
import type { AcquisitionRecord, Metrics } from "../../domain/types";

export const drillDimensions = [
  "platform",
  "account",
  "country",
  "os",
  "campaign",
  "adGroup",
  "creative",
] as const;

export type DrillDimension = (typeof drillDimensions)[number];
export type ContributionMetric = "spend" | "installs";

export interface DrillPathItem {
  dimension: DrillDimension;
  value: string;
}

export interface DimensionRow extends Metrics {
  value: string;
  contribution: number;
}

export interface DailyDetailRow extends Metrics {
  id: string;
  date: string;
  value: string;
  platform: string;
  account: string;
  country: string;
  os: string;
  campaign: string;
  adGroup: string;
  creative: string;
  contribution: number;
}

export interface DailyPerformancePoint {
  date: string;
  spendUsd: number;
  installs: number;
  d7Roas: number;
}

export const dimensionLabels: Record<DrillDimension, string> = {
  platform: "Platform",
  account: "Account",
  country: "Country",
  os: "OS",
  campaign: "Campaign",
  adGroup: "Ad Group",
  creative: "Creative",
};

export function dimensionValue(
  record: AcquisitionRecord,
  dimension: DrillDimension,
): string {
  return record[dimension];
}

export function deriveBaselinePath(
  filters: ReadonlyFilterState,
): DrillPathItem[] {
  const selections: Partial<Record<DrillDimension, readonly string[]>> = {
    platform: filters.platforms,
    account: filters.accounts,
    country: filters.countries,
    os: filters.operatingSystems,
  };

  return drillDimensions.flatMap((dimension) => {
    const values = selections[dimension];
    return values?.length === 1
      ? [{ dimension, value: values[0] }]
      : [];
  });
}

export function applyDrillPath(
  records: readonly AcquisitionRecord[],
  path: readonly DrillPathItem[],
): AcquisitionRecord[] {
  return records.filter((record) =>
    path.every(
      ({ dimension, value }) => dimensionValue(record, dimension) === value,
    ),
  );
}

export function truncateDrillPath(
  path: readonly DrillPathItem[],
  length: number,
): DrillPathItem[] {
  return path.slice(0, Math.max(0, length));
}

export function truncateDrillPathToBaseline(
  path: readonly DrillPathItem[],
  baseline: readonly DrillPathItem[],
  targetDimension?: DrillDimension,
): DrillPathItem[] {
  const baselineDimensions = new Set(
    baseline.map(({ dimension }) => dimension),
  );
  const targetIndex =
    targetDimension === undefined
      ? -1
      : drillDimensions.indexOf(targetDimension);
  const localItems =
    targetIndex < 0
      ? []
      : path.filter(
          ({ dimension }) =>
            !baselineDimensions.has(dimension) &&
            drillDimensions.indexOf(dimension) <= targetIndex,
        );

  return [...baseline, ...localItems].sort(
    (left, right) =>
      drillDimensions.indexOf(left.dimension) -
      drillDimensions.indexOf(right.dimension),
  );
}

export function advanceDrillPath(
  path: readonly DrillPathItem[],
  dimension: DrillDimension,
  value: string,
): DrillPathItem[] {
  const next = path.filter((item) => item.dimension !== dimension);
  next.push({ dimension, value });
  return next.sort(
    (left, right) =>
      drillDimensions.indexOf(left.dimension) -
      drillDimensions.indexOf(right.dimension),
  );
}

export function nextDimension(
  path: readonly DrillPathItem[],
  afterDimension?: DrillDimension,
): DrillDimension {
  const selected = new Set(path.map(({ dimension }) => dimension));
  const startIndex = afterDimension
    ? drillDimensions.indexOf(afterDimension) + 1
    : 0;

  return (
    drillDimensions
      .slice(startIndex)
      .find((dimension) => !selected.has(dimension)) ??
    drillDimensions.find((dimension) => !selected.has(dimension)) ??
    "creative"
  );
}

export function groupDimension(
  records: readonly AcquisitionRecord[],
  dimension: DrillDimension,
  contributionMetric: ContributionMetric,
): DimensionRow[] {
  const groups = new Map<string, AcquisitionRecord[]>();
  for (const record of records) {
    const value = dimensionValue(record, dimension);
    const group = groups.get(value);
    if (group) {
      group.push(record);
    } else {
      groups.set(value, [record]);
    }
  }

  const total = aggregateMetrics([...records]);
  const denominator =
    contributionMetric === "spend" ? total.spendUsd : total.installs;

  return [...groups]
    .map(([value, groupRecords]) => {
      const metrics = aggregateMetrics(groupRecords);
      const numerator =
        contributionMetric === "spend"
          ? metrics.spendUsd
          : metrics.installs;
      return {
        value,
        ...metrics,
        contribution: denominator === 0 ? 0 : numerator / denominator,
      };
    })
    .sort((left, right) => {
      const metricDifference =
        contributionMetric === "spend"
          ? right.spendUsd - left.spendUsd
          : right.installs - left.installs;
      return metricDifference || left.value.localeCompare(right.value);
    });
}

export function searchDimensionRows(
  rows: readonly DimensionRow[],
  query: string,
): DimensionRow[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) {
    return [...rows];
  }

  return rows.filter(({ value }) =>
    value.toLocaleLowerCase().includes(normalizedQuery),
  );
}

function dailyDetailKey(record: AcquisitionRecord): string {
  return [
    record.date,
    record.platform,
    record.account,
    record.country,
    record.os,
    record.campaign,
    record.adGroup,
    record.creative,
  ].join("|");
}

export function buildDailyDetailRows(
  records: readonly AcquisitionRecord[],
  dimension: DrillDimension,
  contributionMetric: ContributionMetric,
): DailyDetailRow[] {
  const groups = new Map<string, AcquisitionRecord[]>();
  for (const record of records) {
    const key = dailyDetailKey(record);
    const group = groups.get(key);
    if (group) {
      group.push(record);
    } else {
      groups.set(key, [record]);
    }
  }

  const total = aggregateMetrics([...records]);
  const denominator =
    contributionMetric === "spend" ? total.spendUsd : total.installs;

  return [...groups.values()]
    .map((groupRecords) => {
      const first = groupRecords[0];
      const metrics = aggregateMetrics(groupRecords);
      const numerator =
        contributionMetric === "spend"
          ? metrics.spendUsd
          : metrics.installs;

      return {
        id: dailyDetailKey(first),
        date: first.date,
        value: dimensionValue(first, dimension),
        platform: first.platform,
        account: first.account,
        country: first.country,
        os: first.os,
        campaign: first.campaign,
        adGroup: first.adGroup,
        creative: first.creative,
        ...metrics,
        contribution: denominator === 0 ? 0 : numerator / denominator,
      };
    })
    .sort(
      (left, right) =>
        right.date.localeCompare(left.date) ||
        right.spendUsd - left.spendUsd ||
        left.value.localeCompare(right.value, "zh-CN"),
    );
}

export function buildDailySeries(
  records: readonly AcquisitionRecord[],
): DailyPerformancePoint[] {
  const groups = new Map<string, AcquisitionRecord[]>();
  for (const record of records) {
    const group = groups.get(record.date);
    if (group) {
      group.push(record);
    } else {
      groups.set(record.date, [record]);
    }
  }

  return [...groups]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, dailyRecords]) => {
      const metrics = aggregateMetrics(dailyRecords);
      return {
        date,
        spendUsd: metrics.spendUsd,
        installs: metrics.installs,
        d7Roas: metrics.d7Roas,
      };
    });
}
