import * as echarts from "echarts";
import {
  useEffect,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
} from "react";

interface ChartProps {
  option: echarts.EChartsOption;
  ariaLabel: string;
  className?: string;
  style?: CSSProperties;
}

export function Chart({
  option,
  ariaLabel,
  className,
  style,
}: ChartProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    const chart = echarts.init(element);
    chartRef.current = chart;
    const resize = () => chart.resize();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(resize);
      observer.observe(element);

      return () => {
        observer.disconnect();
        chartRef.current = null;
        chart.dispose();
      };
    }

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      chartRef.current = null;
      chart.dispose();
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  const classes = ["chart", className].filter(Boolean).join(" ");
  const chartStyle: CSSProperties = {
    minHeight: 280,
    width: "100%",
    ...style,
  };

  return (
    <div
      ref={elementRef}
      className={classes}
      style={chartStyle}
      role={"img" satisfies HTMLAttributes<HTMLDivElement>["role"]}
      aria-label={ariaLabel}
    />
  );
}
