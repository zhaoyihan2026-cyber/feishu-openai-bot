import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { App } from "../../app/App";
import { mockRecords, MOCK_DATA_AS_OF } from "../../data/mock/records";
import { aggregateMetrics } from "../../domain/metrics";
import { BudgetPace } from "./DashboardPage";
import { dashboardFormatters } from "./dashboardPresentation";
import { buildDashboardViewModel } from "./dashboardViewModel";

vi.mock("../../components/charts/Chart", () => ({
  Chart: ({ ariaLabel }: { ariaLabel: string }) => (
    <div role="img" aria-label={ariaLabel} />
  ),
}));

describe("DashboardPage", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/dashboard");
  });

  it("renders agency-report KPIs and every management module", async () => {
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "管理总览" }),
    ).toBeInTheDocument();
    expect(screen.getByText("USD")).toBeInTheDocument();

    const kpis = screen.getByRole("list", { name: "管理总览关键指标" });
    for (const label of [
      "总花费 Spend",
      "安装量 Installs",
      "单次安装成本 CPI",
      "激活率 Activation Rate",
      "付费用户 Payers",
      "D7 ROAS",
      "D30 LTV",
      "D0 ROAS",
      "注册成本 CPR",
      "付费成本 CPP",
      "D1 留存",
      "D7 留存",
    ]) {
      expect(within(kpis).getByText(label)).toBeInTheDocument();
    }
    expect(within(kpis).getAllByRole("listitem")).toHaveLength(12);
    const viewModel = buildDashboardViewModel(mockRecords, {
      dateFrom: "2026-05-08",
      dateTo: "2026-06-06",
      mockAsOfTimestamp: MOCK_DATA_AS_OF,
    });
    expect(
      within(kpis).getByText(
        dashboardFormatters.currency(viewModel.currentMetrics.spendUsd),
      ),
    ).toBeInTheDocument();
    expect(
      within(kpis).queryByText(
        dashboardFormatters.currency(viewModel.selectedRangeMetrics.spendUsd),
      ),
    ).not.toBeInTheDocument();

    for (const heading of [
      "花费与安装趋势",
      "预算节奏",
      "D7 ROAS 趋势",
      "平台构成",
      "国家表现排行",
      "地域分布",
      "异常提醒",
      "平台表现",
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }

    expect(
      screen.getByRole("img", {
        name: /每日花费与安装量趋势，2026-05-08 至 2026-06-06，总花费/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: /每日 D7 ROAS 趋势，2026-05-08 至 2026-06-06，最新/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /平台花费构成，共 6 个平台，最高/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: /国家花费地域分布，共 6 个国家，最高/,
      }),
    ).toBeInTheDocument();
  });

  it("shows anomaly severity and formatted current-versus-comparison details", async () => {
    render(<App />);

    const anomalies = await screen.findByRole("heading", {
      name: "异常提醒",
    });
    const module = anomalies.closest("section");
    expect(module).not.toBeNull();

    expect(within(module!).getAllByText("高风险").length).toBeGreaterThan(0);
    expect(within(module!).getByText("中风险")).toBeInTheDocument();
    expect(within(module!).getByText("当前 CPI")).toBeInTheDocument();
    expect(within(module!).getByText("上期 CPI")).toBeInTheDocument();
    expect(within(module!).getByText("当前预算进度")).toBeInTheDocument();
    expect(within(module!).getByText("当前时间进度")).toBeInTheDocument();
    expect(within(module!).getByText("当前延迟")).toBeInTheDocument();
    expect(within(module!).getByText("告警阈值")).toBeInTheDocument();
    expect(within(module!).getByText("118.0%")).toBeInTheDocument();
    expect(within(module!).getByText("100.0%")).toBeInTheDocument();
  });

  it("shows selected-day KPI values and new comparisons for a one-day interval", async () => {
    const user = userEvent.setup();
    render(<App />);

    const dateFrom = await screen.findByLabelText("开始日期 From");
    const dateTo = screen.getByLabelText("结束日期 To");
    await user.clear(dateFrom);
    await user.type(dateFrom, "2026-06-06");
    await user.clear(dateTo);
    await user.type(dateTo, "2026-06-06");

    const selectedDayMetrics = aggregateMetrics(
      mockRecords.filter(({ date }) => date === "2026-06-06"),
    );
    const kpis = await screen.findByRole("list", {
      name: "管理总览关键指标",
    });

    expect(
      within(kpis).getByText(
        dashboardFormatters.currency(selectedDayMetrics.spendUsd),
      ),
    ).toBeInTheDocument();
    expect(within(kpis).getAllByText("较上期 新增").length).toBeGreaterThan(0);
  });

  it("keeps the heading visible and provides reset guidance for empty filters", async () => {
    const user = userEvent.setup();
    render(<App />);

    const dateFrom = await screen.findByLabelText("开始日期 From");
    const dateTo = screen.getByLabelText("结束日期 To");
    await user.clear(dateFrom);
    await user.type(dateFrom, "2027-01-01");
    await user.clear(dateTo);
    await user.type(dateTo, "2027-01-02");

    expect(
      screen.getByRole("heading", { name: "管理总览" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "当前筛选无数据" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "重置筛选" }));

    expect(
      await screen.findByRole("heading", { name: "预算节奏" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "当前筛选无数据" }),
    ).not.toBeInTheDocument();
  });

  it("sets the global platform filter before navigating to performance", async () => {
    const user = userEvent.setup();
    render(<App />);

    const table = await screen.findByRole("region", { name: "平台表现数据表" });
    await user.click(within(table).getByRole("button", { name: "Meta Ads" }));

    expect(
      await screen.findByRole("heading", { name: "投放分析" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("平台 Platform")).toHaveValue("Meta Ads");
  });

  it("clamps budget and time progress bars to valid accessible percentages", () => {
    render(<BudgetPace budgetPace={1.25} timePace={-0.1} />);

    const budgetProgress = screen.getByRole("progressbar", {
      name: "预算消耗进度",
    });
    const timeProgress = screen.getByRole("progressbar", {
      name: "时间进度",
    });

    expect(budgetProgress).toHaveAttribute("aria-valuenow", "100");
    expect(timeProgress).toHaveAttribute("aria-valuenow", "0");
    expect(budgetProgress.firstElementChild).toHaveStyle({ width: "100%" });
    expect(timeProgress.firstElementChild).toHaveStyle({ width: "0%" });
  });
});
