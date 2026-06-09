import type { EChartsOption } from "echarts";
import type { CreativeDailyPoint } from "./creativeAnalysis";

export const creativeFormatters = {
  currency: new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format,
  percent: new Intl.NumberFormat("zh-CN", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format,
};

export interface CreativeTrendInput {
  creative: string;
  series: CreativeDailyPoint[];
}

export function buildCreativeTrendAriaLabel({
  creative,
  series,
}: CreativeTrendInput): string {
  const firstDate = series[0]?.date ?? "无日期";
  const lastDate = series.at(-1)?.date ?? firstDate;
  const totalSpend = series.reduce((sum, point) => sum + point.spendUsd, 0);
  return `${creative} 每日趋势，${firstDate} 至 ${lastDate}，展示 Spend、CPI 与 D7 ROAS，总花费 ${creativeFormatters.currency(totalSpend)}。`;
}

export function buildCreativeTrendOptions(
  input: CreativeTrendInput,
): EChartsOption {
  const ariaLabel = buildCreativeTrendAriaLabel(input);
  const axisLine = { lineStyle: { color: "#cfd0ca" } };
  const splitLine = { lineStyle: { color: "#e7e7e2" } };

  return {
    aria: { enabled: true, description: ariaLabel },
    animationDuration: 350,
    color: ["#0f6b58", "#b56d2d", "#76659b"],
    tooltip: {
      trigger: "axis",
      backgroundColor: "#ffffff",
      borderColor: "#cfd0ca",
      textStyle: { color: "#171717", fontSize: 12 },
    },
    legend: {
      top: 0,
      right: 0,
      textStyle: { color: "#686b66", fontSize: 10 },
    },
    grid: { top: 48, right: 84, bottom: 34, left: 56 },
    xAxis: {
      type: "category",
      data: input.series.map(({ date }) => date),
      axisLine,
      axisLabel: { color: "#686b66", fontSize: 10 },
    },
    yAxis: [
      {
        type: "value",
        name: "USD",
        axisLine,
        splitLine,
        axisLabel: { color: "#686b66", fontSize: 10 },
      },
      {
        type: "value",
        name: "CPI",
        axisLine,
        splitLine: { show: false },
        axisLabel: { color: "#686b66", fontSize: 10 },
      },
      {
        type: "value",
        name: "ROAS",
        offset: 44,
        axisLine,
        splitLine: { show: false },
        axisLabel: {
          color: "#686b66",
          fontSize: 10,
          formatter: (value: number) => creativeFormatters.percent(value),
        },
      },
    ],
    series: [
      {
        name: "Spend",
        type: "bar",
        barMaxWidth: 14,
        data: input.series.map(({ spendUsd }) => spendUsd),
        itemStyle: { color: "#0f6b58", borderRadius: [2, 2, 0, 0] },
      },
      {
        name: "CPI",
        type: "line",
        yAxisIndex: 1,
        symbolSize: 4,
        smooth: false,
        data: input.series.map(({ cpi }) => cpi),
        lineStyle: { width: 2, color: "#b56d2d" },
        itemStyle: { color: "#b56d2d" },
      },
      {
        name: "D7 ROAS",
        type: "line",
        yAxisIndex: 2,
        symbolSize: 4,
        smooth: false,
        data: input.series.map(({ d7Roas }) => d7Roas),
        lineStyle: { width: 2, color: "#76659b" },
        itemStyle: { color: "#76659b" },
      },
    ],
  };
}
