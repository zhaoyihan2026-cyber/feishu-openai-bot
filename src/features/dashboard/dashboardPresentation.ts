import type { EChartsOption } from "echarts";
import type { KpiItem, KpiStatus } from "../../components/metrics/KpiStrip";
import type { Anomaly } from "../../domain/anomalies";
import type { Metrics } from "../../domain/types";
import type {
  CountrySummary,
  DashboardComparisons,
  DailyPoint,
  MetricComparison,
  PlatformSummary,
} from "./dashboardViewModel";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const integer = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});
const percent = new Intl.NumberFormat("zh-CN", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function comparisonText(comparison: MetricComparison): string {
  if (comparison.trend === "new") {
    return "较上期 新增";
  }

  const normalizedChange =
    comparison.change !== null &&
    Math.abs(comparison.change) < 0.0005
      ? 0
      : (comparison.change ?? 0);
  const sign = normalizedChange > 0 ? "+" : "";
  return `较上期 ${sign}${percent.format(normalizedChange)}`;
}

function statusForChange(
  comparison: MetricComparison,
  direction: "higher" | "lower",
): KpiStatus {
  if (comparison.trend === "new") {
    return direction === "higher" ? "positive" : "warning";
  }
  const change = comparison.change ?? 0;
  if (Math.abs(change) < 0.005) {
    return "neutral";
  }
  const improved = direction === "higher" ? change > 0 : change < 0;
  return improved ? "positive" : "negative";
}

export function buildDashboardKpis(
  metrics: Metrics,
  comparisons: DashboardComparisons,
): KpiItem[] {
  return [
    {
      id: "spend",
      label: "总花费 Spend",
      value: currency.format(metrics.spendUsd),
      comparison: comparisonText(comparisons.spendUsd),
      status:
        comparisons.spendUsd.trend === "new" ? "warning" : "neutral",
    },
    {
      id: "installs",
      label: "安装量 Installs",
      value: integer.format(metrics.installs),
      comparison: comparisonText(comparisons.installs),
      status: statusForChange(comparisons.installs, "higher"),
    },
    {
      id: "cpi",
      label: "单次安装成本 CPI",
      value: currency.format(metrics.cpi),
      comparison: comparisonText(comparisons.cpi),
      status: statusForChange(comparisons.cpi, "lower"),
    },
    {
      id: "activation-rate",
      label: "激活率 Activation Rate",
      value: percent.format(metrics.activationRate),
      comparison: comparisonText(comparisons.activationRate),
      status: statusForChange(comparisons.activationRate, "higher"),
    },
    {
      id: "payers",
      label: "付费用户 Payers",
      value: integer.format(metrics.payers),
      comparison: comparisonText(comparisons.payers),
      status: statusForChange(comparisons.payers, "higher"),
    },
    {
      id: "d7-roas",
      label: "D7 ROAS",
      value: percent.format(metrics.d7Roas),
      comparison: comparisonText(comparisons.d7Roas),
      status: statusForChange(comparisons.d7Roas, "higher"),
    },
    {
      id: "d30-ltv",
      label: "D30 LTV",
      value: currency.format(metrics.d30Ltv),
      comparison: comparisonText(comparisons.d30Ltv),
      status: statusForChange(comparisons.d30Ltv, "higher"),
    },
    {
      id: "d0-roas",
      label: "D0 ROAS",
      value: percent.format(metrics.d0Roas),
      comparison: comparisonText(comparisons.d0Roas),
      status: statusForChange(comparisons.d0Roas, "higher"),
    },
    {
      id: "cpr",
      label: "注册成本 CPR",
      value: currency.format(metrics.cpr),
      comparison: comparisonText(comparisons.cpr),
      status: statusForChange(comparisons.cpr, "lower"),
    },
    {
      id: "cpp",
      label: "付费成本 CPP",
      value: currency.format(metrics.cpp),
      comparison: comparisonText(comparisons.cpp),
      status: statusForChange(comparisons.cpp, "lower"),
    },
    {
      id: "d1-retention",
      label: "D1 留存",
      value: percent.format(metrics.d1RetentionRate),
      comparison: comparisonText(comparisons.d1RetentionRate),
      status: statusForChange(comparisons.d1RetentionRate, "higher"),
    },
    {
      id: "d7-retention",
      label: "D7 留存",
      value: percent.format(metrics.d7RetentionRate),
      comparison: comparisonText(comparisons.d7RetentionRate),
      status: statusForChange(comparisons.d7RetentionRate, "higher"),
    },
  ];
}

export interface DashboardChartInput {
  dailySeries: DailyPoint[];
  platforms: PlatformSummary[];
  countries: CountrySummary[];
}

export interface DashboardChartAriaLabels {
  spendAndInstalls: string;
  d7Roas: string;
  platformMix: string;
  countryMap: string;
}

export interface DashboardChartOptions {
  spendAndInstalls: EChartsOption;
  d7Roas: EChartsOption;
  platformMix: EChartsOption;
  countryMap: EChartsOption;
}

const axisStyle = {
  axisLine: { lineStyle: { color: "#cfd0ca" } },
  axisLabel: { color: "#686b66", fontSize: 11 },
  splitLine: { lineStyle: { color: "#e7e7e2" } },
};

const tooltip = {
  trigger: "axis" as const,
  backgroundColor: "#ffffff",
  borderColor: "#cfd0ca",
  textStyle: { color: "#171717", fontSize: 12 },
};

export function buildDashboardChartAriaLabels({
  dailySeries,
  platforms,
  countries,
}: DashboardChartInput): DashboardChartAriaLabels {
  const firstDate = dailySeries[0]?.date ?? "无日期";
  const lastDate = dailySeries.at(-1)?.date ?? firstDate;
  const totalSpend = dailySeries.reduce(
    (sum, { spendUsd }) => sum + spendUsd,
    0,
  );
  const totalInstalls = dailySeries.reduce(
    (sum, { installs }) => sum + installs,
    0,
  );
  const latestRoas = dailySeries.at(-1)?.d7Roas ?? 0;
  const topPlatform = platforms[0];
  const topCountry = countries[0];

  return {
    spendAndInstalls: `每日花费与安装量趋势，${firstDate} 至 ${lastDate}，总花费 ${currency.format(
      totalSpend,
    )}，总安装 ${integer.format(totalInstalls)}。`,
    d7Roas: `每日 D7 ROAS 趋势，${firstDate} 至 ${lastDate}，最新 ${percent.format(
      latestRoas,
    )}。`,
    platformMix: `平台花费构成，共 ${platforms.length} 个平台，最高 ${
      topPlatform
        ? `${topPlatform.platform} ${currency.format(topPlatform.spendUsd)}`
        : "无数据"
    }。`,
    countryMap: `国家花费地域分布，共 ${countries.length} 个国家，最高 ${
      topCountry
        ? `${topCountry.country} ${currency.format(topCountry.spendUsd)}`
        : "无数据"
    }。`,
  };
}

export function buildDashboardChartOptions({
  dailySeries,
  platforms,
  countries,
}: DashboardChartInput): DashboardChartOptions {
  const dates = dailySeries.map(({ date }) => date.slice(5));
  const ariaLabels = buildDashboardChartAriaLabels({
    dailySeries,
    platforms,
    countries,
  });

  return {
    spendAndInstalls: {
      aria: { enabled: true, description: ariaLabels.spendAndInstalls },
      animationDuration: 350,
      color: ["#0f6b58", "#b56d2d"],
      tooltip,
      legend: {
        top: 0,
        right: 0,
        textStyle: { color: "#686b66", fontSize: 11 },
      },
      grid: { top: 42, right: 46, bottom: 28, left: 54 },
      xAxis: {
        type: "category",
        data: dates,
        boundaryGap: true,
        ...axisStyle,
      },
      yAxis: [
        {
          type: "value",
          name: "USD",
          nameTextStyle: { color: "#686b66" },
          ...axisStyle,
        },
        {
          type: "value",
          name: "Installs",
          nameTextStyle: { color: "#686b66" },
          ...axisStyle,
        },
      ],
      series: [
        {
          name: "花费 Spend",
          type: "bar",
          barMaxWidth: 16,
          data: dailySeries.map(({ spendUsd }) => spendUsd),
          itemStyle: { color: "#0f6b58", borderRadius: [2, 2, 0, 0] },
        },
        {
          name: "安装 Installs",
          type: "line",
          yAxisIndex: 1,
          smooth: false,
          symbolSize: 5,
          data: dailySeries.map(({ installs }) => installs),
          lineStyle: { width: 2, color: "#b56d2d" },
          itemStyle: { color: "#b56d2d" },
        },
      ],
    },
    d7Roas: {
      aria: { enabled: true, description: ariaLabels.d7Roas },
      animationDuration: 350,
      color: ["#76659b"],
      tooltip: {
        ...tooltip,
        valueFormatter: (value: unknown) =>
          percent.format(Number(value ?? 0)),
      },
      grid: { top: 22, right: 18, bottom: 28, left: 50 },
      xAxis: {
        type: "category",
        data: dates,
        boundaryGap: false,
        ...axisStyle,
      },
      yAxis: {
        type: "value",
        axisLabel: {
          color: "#686b66",
          fontSize: 11,
          formatter: (value: number) => percent.format(value),
        },
        axisLine: axisStyle.axisLine,
        splitLine: axisStyle.splitLine,
      },
      series: [
        {
          name: "D7 ROAS",
          type: "line",
          smooth: false,
          symbol: "circle",
          symbolSize: 5,
          data: dailySeries.map(({ d7Roas }) => d7Roas),
          lineStyle: { width: 2, color: "#76659b" },
          itemStyle: { color: "#76659b" },
          areaStyle: { color: "rgba(118, 101, 155, 0.10)" },
        },
      ],
    },
    platformMix: {
      aria: { enabled: true, description: ariaLabels.platformMix },
      animationDuration: 350,
      color: ["#0f6b58", "#b56d2d", "#76659b", "#4f7291", "#b14f62", "#68735d"],
      tooltip: {
        trigger: "item",
        formatter: "{b}<br/>${c} ({d}%)",
        backgroundColor: "#ffffff",
        borderColor: "#cfd0ca",
        textStyle: { color: "#171717", fontSize: 12 },
      },
      legend: {
        type: "scroll",
        bottom: 0,
        textStyle: { color: "#686b66", fontSize: 10 },
      },
      series: [
        {
          name: "平台花费",
          type: "pie",
          radius: ["48%", "70%"],
          center: ["50%", "45%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderColor: "#ffffff",
            borderWidth: 2,
            borderRadius: 2,
          },
          label: { show: false },
          emphasis: { label: { show: true, fontWeight: 700 } },
          data: platforms.map(({ platform, spendUsd }) => ({
            name: platform,
            value: Number(spendUsd.toFixed(2)),
          })),
        },
      ],
    },
    countryMap: {
      aria: { enabled: true, description: ariaLabels.countryMap },
      animationDuration: 350,
      color: ["#4f7291"],
      tooltip: {
        ...tooltip,
        valueFormatter: (value: unknown) => currency.format(Number(value ?? 0)),
      },
      grid: { top: 8, right: 20, bottom: 24, left: 42 },
      xAxis: {
        type: "category",
        data: countries.map(({ country }) => country),
        ...axisStyle,
      },
      yAxis: {
        type: "value",
        axisLabel: {
          color: "#686b66",
          fontSize: 11,
          formatter: (value: number) => `$${integer.format(value)}`,
        },
        axisLine: axisStyle.axisLine,
        splitLine: axisStyle.splitLine,
      },
      series: [
        {
          name: "国家花费",
          type: "bar",
          barMaxWidth: 28,
          data: countries.map(({ spendUsd }) => spendUsd),
          itemStyle: { color: "#4f7291", borderRadius: [2, 2, 0, 0] },
        },
      ],
    },
  };
}

export interface FormattedAnomalyValues {
  currentLabel: string;
  currentValue: string;
  comparisonLabel: string;
  comparisonValue: string;
}

export function formatAnomalyValues(
  anomaly: Anomaly,
): FormattedAnomalyValues {
  switch (anomaly.kind) {
    case "cpi":
      return {
        currentLabel: "当前 CPI",
        currentValue: currency.format(anomaly.currentValue),
        comparisonLabel: "上期 CPI",
        comparisonValue: currency.format(anomaly.comparisonValue),
      };
    case "d7Roas":
      return {
        currentLabel: "当前 D7 ROAS",
        currentValue: percent.format(anomaly.currentValue),
        comparisonLabel: "上期 D7 ROAS",
        comparisonValue: percent.format(anomaly.comparisonValue),
      };
    case "budgetPace":
      return {
        currentLabel: "当前预算进度",
        currentValue: percent.format(anomaly.currentValue),
        comparisonLabel: "当前时间进度",
        comparisonValue: percent.format(anomaly.comparisonValue),
      };
    case "dataDelay":
      return {
        currentLabel: "当前延迟",
        currentValue: `${anomaly.currentValue.toFixed(1)} 小时`,
        comparisonLabel: "告警阈值",
        comparisonValue: `${anomaly.comparisonValue.toFixed(1)} 小时`,
      };
  }
}

export const dashboardFormatters = {
  currency: (value: number) => currency.format(value),
  integer: (value: number) => integer.format(value),
  percent: (value: number) => percent.format(value),
};
