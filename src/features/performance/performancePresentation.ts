import type { EChartsOption } from "echarts";
import type { Metrics } from "../../domain/types";
import type {
  ContributionMetric,
  DailyPerformancePoint,
  DimensionRow,
  DrillDimension,
} from "./performanceAnalysis";
import { dimensionLabels } from "./performanceAnalysis";

export const performanceFormatters = {
  currency: new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format,
  integer: new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format,
  percent: new Intl.NumberFormat("zh-CN", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format,
};

interface PerformanceChartInput {
  metrics: Metrics;
  dailySeries: DailyPerformancePoint[];
  rows: DimensionRow[];
  dimension: DrillDimension;
  contributionMetric: ContributionMetric;
}

export interface PerformanceChartOptions {
  funnel: EChartsOption;
  daily: EChartsOption;
  contribution: EChartsOption;
}

export interface PerformanceChartAriaLabels {
  funnel: string;
  daily: string;
  contribution: string;
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

export function buildPerformanceChartAriaLabels({
  metrics,
  dailySeries,
  rows,
  dimension,
  contributionMetric,
}: PerformanceChartInput): PerformanceChartAriaLabels {
  const firstDate = dailySeries[0]?.date ?? "无日期";
  const lastDate = dailySeries.at(-1)?.date ?? firstDate;
  const top = rows[0];
  const metricLabel = contributionMetric === "spend" ? "花费" : "安装";

  return {
    funnel: `获客漏斗，曝光 ${performanceFormatters.integer(
      metrics.impressions,
    )}，点击 ${performanceFormatters.integer(
      metrics.clicks,
    )}，安装 ${performanceFormatters.integer(
      metrics.installs,
    )}，激活 ${performanceFormatters.integer(
      metrics.activations,
    )}，付费用户 ${performanceFormatters.integer(metrics.payers)}。`,
    daily: `选中范围每日趋势，${firstDate} 至 ${lastDate}，总花费 ${performanceFormatters.currency(
      metrics.spendUsd,
    )}，总安装 ${performanceFormatters.integer(
      metrics.installs,
    )}，D7 ROAS ${performanceFormatters.percent(metrics.d7Roas)}。`,
    contribution: `${dimensionLabels[dimension]} ${metricLabel}贡献排行，共 ${
      rows.length
    } 项，最高 ${top ? top.value : "无数据"}。`,
  };
}

export function buildPerformanceChartOptions(
  input: PerformanceChartInput,
): PerformanceChartOptions {
  const {
    metrics,
    dailySeries,
    rows,
    dimension,
    contributionMetric,
  } = input;
  const aria = buildPerformanceChartAriaLabels(input);
  const funnelData = [
    { name: "Impressions", value: metrics.impressions },
    { name: "Clicks", value: metrics.clicks },
    { name: "Installs", value: metrics.installs },
    { name: "Activations", value: metrics.activations },
    { name: "Payers", value: metrics.payers },
  ];
  const ranking = rows.slice(0, 8).reverse();

  return {
    funnel: {
      aria: { enabled: true, description: aria.funnel },
      animationDuration: 350,
      color: ["#0f6b58"],
      tooltip,
      grid: { top: 18, right: 24, bottom: 24, left: 88 },
      xAxis: { type: "value", ...axisStyle },
      yAxis: {
        type: "category",
        data: funnelData.map(({ name }) => name).reverse(),
        ...axisStyle,
      },
      series: [
        {
          name: "Users",
          type: "bar",
          barMaxWidth: 24,
          data: funnelData.map(({ value }) => value).reverse(),
          itemStyle: { color: "#0f6b58", borderRadius: [0, 2, 2, 0] },
        },
      ],
    },
    daily: {
      aria: { enabled: true, description: aria.daily },
      animationDuration: 350,
      color: ["#0f6b58", "#b56d2d", "#76659b"],
      tooltip,
      legend: {
        top: 0,
        right: 0,
        textStyle: { color: "#686b66", fontSize: 10 },
      },
      grid: { top: 46, right: 78, bottom: 28, left: 52 },
      xAxis: {
        type: "category",
        data: dailySeries.map(({ date }) => date.slice(5)),
        boundaryGap: true,
        ...axisStyle,
      },
      yAxis: [
        { type: "value", name: "USD", ...axisStyle },
        { type: "value", name: "Installs", ...axisStyle },
        {
          type: "value",
          name: "ROAS",
          offset: 42,
          axisLabel: {
            color: "#686b66",
            fontSize: 10,
            formatter: (value: number) =>
              performanceFormatters.percent(value),
          },
          axisLine: axisStyle.axisLine,
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: "Spend",
          type: "bar",
          barMaxWidth: 14,
          data: dailySeries.map(({ spendUsd }) => spendUsd),
          itemStyle: { color: "#0f6b58", borderRadius: [2, 2, 0, 0] },
        },
        {
          name: "Installs",
          type: "line",
          yAxisIndex: 1,
          symbolSize: 4,
          smooth: false,
          data: dailySeries.map(({ installs }) => installs),
          lineStyle: { width: 2, color: "#b56d2d" },
          itemStyle: { color: "#b56d2d" },
        },
        {
          name: "D7 ROAS",
          type: "line",
          yAxisIndex: 2,
          symbolSize: 4,
          smooth: false,
          data: dailySeries.map(({ d7Roas }) => d7Roas),
          lineStyle: { width: 2, color: "#76659b" },
          itemStyle: { color: "#76659b" },
        },
      ],
    },
    contribution: {
      aria: { enabled: true, description: aria.contribution },
      animationDuration: 350,
      color: ["#4f7291"],
      tooltip,
      grid: { top: 18, right: 24, bottom: 24, left: 150 },
      xAxis: {
        type: "value",
        axisLabel: {
          color: "#686b66",
          fontSize: 10,
          formatter: (value: number) =>
            contributionMetric === "spend"
              ? performanceFormatters.currency(value)
              : performanceFormatters.integer(value),
        },
        axisLine: axisStyle.axisLine,
        splitLine: axisStyle.splitLine,
      },
      yAxis: {
        type: "category",
        name: dimensionLabels[dimension],
        data: ranking.map(({ value }) => value),
        axisLabel: {
          color: "#686b66",
          fontSize: 10,
          width: 128,
          overflow: "truncate",
        },
        axisLine: axisStyle.axisLine,
      },
      series: [
        {
          name: contributionMetric === "spend" ? "Spend" : "Installs",
          type: "bar",
          barMaxWidth: 20,
          data: ranking.map((row) =>
            contributionMetric === "spend"
              ? row.spendUsd
              : row.installs,
          ),
          itemStyle: { color: "#4f7291", borderRadius: [0, 2, 2, 0] },
        },
      ],
    },
  };
}
