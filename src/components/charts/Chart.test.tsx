import { render } from "@testing-library/react";
import type { EChartsOption } from "echarts";
import { vi } from "vitest";
import { Chart } from "./Chart";

const echartsMocks = vi.hoisted(() => ({
  chart: {
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  },
  init: vi.fn(),
}));

vi.mock("echarts", () => ({
  init: echartsMocks.init,
}));

class ResizeObserverMock {
  static instances: ResizeObserverMock[] = [];

  callback: ResizeObserverCallback;
  observe = vi.fn();
  disconnect = vi.fn();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    ResizeObserverMock.instances.push(this);
  }
}

describe("Chart", () => {
  beforeEach(() => {
    echartsMocks.init.mockReset();
    echartsMocks.chart.setOption.mockReset();
    echartsMocks.chart.resize.mockReset();
    echartsMocks.chart.dispose.mockReset();
    echartsMocks.init.mockReturnValue(echartsMocks.chart);
    ResizeObserverMock.instances = [];
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("reuses one chart instance and cleans it up on unmount", () => {
    const firstOption: EChartsOption = { xAxis: { type: "category" } };
    const secondOption: EChartsOption = { xAxis: { type: "value" } };
    const { getByRole, rerender, unmount } = render(
      <Chart option={firstOption} ariaLabel="Spend trend" />,
    );

    expect(getByRole("img", { name: "Spend trend" })).toHaveStyle({
      minHeight: "280px",
    });
    expect(echartsMocks.init).toHaveBeenCalledTimes(1);
    expect(echartsMocks.chart.setOption).toHaveBeenLastCalledWith(
      firstOption,
      true,
    );

    rerender(<Chart option={secondOption} ariaLabel="Spend trend" />);

    expect(echartsMocks.init).toHaveBeenCalledTimes(1);
    expect(echartsMocks.chart.setOption).toHaveBeenLastCalledWith(
      secondOption,
      true,
    );

    ResizeObserverMock.instances[0].callback([], {} as ResizeObserver);
    expect(echartsMocks.chart.resize).toHaveBeenCalledTimes(1);

    unmount();
    expect(ResizeObserverMock.instances[0].disconnect).toHaveBeenCalled();
    expect(echartsMocks.chart.dispose).toHaveBeenCalled();
  });

  it("uses and cleans up the window resize fallback without ResizeObserver", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    const addEventListener = vi.spyOn(window, "addEventListener");
    const removeEventListener = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(
      <Chart option={{ series: [] }} ariaLabel="Fallback chart" />,
    );

    expect(addEventListener).toHaveBeenCalledWith("resize", expect.any(Function));

    window.dispatchEvent(new Event("resize"));
    expect(echartsMocks.chart.resize).toHaveBeenCalledTimes(1);

    unmount();
    expect(removeEventListener).toHaveBeenCalledWith(
      "resize",
      expect.any(Function),
    );
    expect(echartsMocks.chart.dispose).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event("resize"));
    expect(echartsMocks.chart.resize).toHaveBeenCalledTimes(1);
  });
});
