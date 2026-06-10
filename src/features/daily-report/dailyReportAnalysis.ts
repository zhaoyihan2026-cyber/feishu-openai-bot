import { aggregateMetrics } from "../../domain/metrics";
import type { AcquisitionRecord, Metrics } from "../../domain/types";

const DAY_MS = 86_400_000;

export interface DailyReportOptions {
  dateFrom: string;
  dateTo: string;
}

export interface DailyReportMetric {
  id: keyof Metrics;
  label: string;
  format: "currency" | "integer" | "number" | "percent";
}

export interface DailyReportCountryRow extends Metrics {
  country: string;
}

export interface DailyReportMetricRow {
  id: keyof Metrics;
  label: string;
  format: DailyReportMetric["format"];
  total: number;
  valuesByDate: Record<string, number>;
}

export interface DailyReportPivotRow {
  label: string;
  metrics: DailyReportMetricRow[];
}

export interface DailyReportViewModel {
  title: string;
  channelName: string;
  dates: string[];
  countryRows: DailyReportCountryRow[];
  campaignRows: DailyReportPivotRow[];
  creativeRows: DailyReportPivotRow[];
}

export const dailyReportMetrics: DailyReportMetric[] = [
  { id: "spendUsd", label: "消耗", format: "currency" },
  { id: "impressions", label: "展示次数", format: "integer" },
  { id: "clicks", label: "点击次数", format: "integer" },
  { id: "installs", label: "安装人数", format: "integer" },
  { id: "activations", label: "注册人数", format: "integer" },
  { id: "payers", label: "付费人数", format: "integer" },
  { id: "revenueD7Usd", label: "付费价值", format: "currency" },
  { id: "cpi", label: "CPI", format: "currency" },
  { id: "cpr", label: "CPR", format: "currency" },
  { id: "cpp", label: "CPP", format: "currency" },
  { id: "cpm", label: "CPM", format: "currency" },
  { id: "cpc", label: "CPC", format: "currency" },
  { id: "ipm", label: "IPM", format: "number" },
  { id: "ctr", label: "CTR", format: "percent" },
  { id: "cvr", label: "CVR", format: "percent" },
  { id: "d0Roas", label: "D0 ROAS", format: "percent" },
  { id: "d1RetentionRate", label: "D1留存率", format: "percent" },
  { id: "d7RetentionRate", label: "D7留存率", format: "percent" },
];

function dateRangeDescending(dateFrom: string, dateTo: string): string[] {
  const start = Date.parse(`${dateFrom}T00:00:00Z`);
  const end = Date.parse(`${dateTo}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return [];
  }

  const dates: string[] = [];
  for (let timestamp = end; timestamp >= start; timestamp -= DAY_MS) {
    dates.push(new Date(timestamp).toISOString().slice(0, 10));
  }
  return dates;
}

function groupBy(
  records: readonly AcquisitionRecord[],
  keyForRecord: (record: AcquisitionRecord) => string,
): Map<string, AcquisitionRecord[]> {
  const groups = new Map<string, AcquisitionRecord[]>();
  for (const record of records) {
    const key = keyForRecord(record).trim() || "未命名";
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }
  return groups;
}

function resolveChannelName(records: readonly AcquisitionRecord[]): string {
  const platforms = [...new Set(records.map(({ platform }) => platform))];
  return platforms.length === 1 ? platforms[0] : "全部渠道";
}

function makeCountryRows(
  records: readonly AcquisitionRecord[],
): DailyReportCountryRow[] {
  return [...groupBy(records, ({ country }) => country)]
    .map(([country, groupRecords]) => ({
      country,
      ...aggregateMetrics(groupRecords),
    }))
    .sort(
      (left, right) =>
        right.spendUsd - left.spendUsd ||
        left.country.localeCompare(right.country, "zh-CN"),
    );
}

function makeMetricRows(
  records: readonly AcquisitionRecord[],
  dates: readonly string[],
): DailyReportMetricRow[] {
  const recordsByDate = groupBy(records, ({ date }) => date);
  const totalMetrics = aggregateMetrics([...records]);

  return dailyReportMetrics.map(({ id, label, format }) => ({
    id,
    label,
    format,
    total: totalMetrics[id],
    valuesByDate: Object.fromEntries(
      dates.map((date) => [
        date,
        aggregateMetrics(recordsByDate.get(date) ?? [])[id],
      ]),
    ),
  }));
}

function makePivotRows(
  records: readonly AcquisitionRecord[],
  dates: readonly string[],
  keyForRecord: (record: AcquisitionRecord) => string,
): DailyReportPivotRow[] {
  return [...groupBy(records, keyForRecord)]
    .map(([label, groupRecords]) => ({
      label,
      metrics: makeMetricRows(groupRecords, dates),
    }))
    .sort((left, right) => {
      const leftSpend =
        left.metrics.find(({ id }) => id === "spendUsd")?.total ?? 0;
      const rightSpend =
        right.metrics.find(({ id }) => id === "spendUsd")?.total ?? 0;
      return rightSpend - leftSpend || left.label.localeCompare(right.label);
    });
}

export function buildDailyReportViewModel(
  records: readonly AcquisitionRecord[],
  options: DailyReportOptions,
): DailyReportViewModel {
  const dates = dateRangeDescending(options.dateFrom, options.dateTo);
  const channelName = resolveChannelName(records);

  return {
    title: `${channelName} - 新用户行为`,
    channelName,
    dates,
    countryRows: makeCountryRows(records),
    campaignRows: makePivotRows(records, dates, ({ campaign }) => campaign),
    creativeRows: makePivotRows(
      records,
      dates,
      ({ campaign, creative }) => `${campaign} / ${creative}`,
    ),
  };
}
