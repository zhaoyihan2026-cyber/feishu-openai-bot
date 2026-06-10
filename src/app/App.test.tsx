import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { mockRecords } from "../data/mock/records";
import {
  createDefaultCreativeFilters,
  filterAndSortCreatives,
  groupCreatives,
  type CreativeSort,
} from "../features/creatives/creativeAnalysis";
import { App } from "./App";

vi.mock("../components/charts/Chart", () => ({
  Chart: ({ ariaLabel }: { ariaLabel: string }) => (
    <div role="img" aria-label={ariaLabel} />
  ),
}));

describe("App", () => {
  it("renders the primary report navigation", async () => {
    window.history.pushState({}, "", "/");

    render(<App />);

    expect(screen.getByRole("link", { name: "总览" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "投放分析" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "素材分析" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "数据管理" })).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "管理总览" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("总花费 Spend")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "预算节奏" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "异常提醒" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "平台表现" })).toBeInTheDocument();
  });

  it("opens the data management route", async () => {
    window.history.pushState({}, "", "/data");

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "数据管理" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("当前使用模拟数据")).toBeInTheDocument();
  });

  it("navigates between performance and creative analysis", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/");

    render(<App />);

    await user.click(screen.getByRole("link", { name: "投放分析" }));
    expect(
      await screen.findByRole("heading", { name: "投放分析" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "素材分析" }));
    expect(
      await screen.findByRole("heading", { name: "素材分析" }),
    ).toBeInTheDocument();
  });

  it("drills from platform to account on the performance page", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/performance");

    render(<App />);

    const table = await screen.findByRole("region", {
      name: "投放分析明细表",
    });
    await user.click(within(table).getByRole("button", { name: "Meta Ads" }));

    const breadcrumb = screen.getByRole("navigation", { name: "投放分析路径" });
    expect(within(breadcrumb).getByText("Platform / Meta Ads")).toBeInTheDocument();
    expect(screen.getByText("Account", { selector: ".performance-current-dimension" }))
      .toBeInTheDocument();
    expect(
      within(table).getByRole("button", { name: "Meta Ads Growth Account" }),
    ).toBeInTheDocument();
  });

  it("starts at account when dashboard navigation sets a platform filter", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/");

    render(<App />);

    const dashboardTable = await screen.findByRole("region", {
      name: "平台表现数据表",
    });
    await user.click(
      within(dashboardTable).getByRole("button", { name: "Meta Ads" }),
    );

    const breadcrumb = await screen.findByRole("navigation", {
      name: "投放分析路径",
    });
    expect(within(breadcrumb).getByText("Platform / Meta Ads")).toBeInTheDocument();
    expect(screen.getByText("Account", { selector: ".performance-current-dimension" }))
      .toBeInTheDocument();
    expect(screen.getByLabelText("平台 Platform")).toHaveValue("Meta Ads");
  });

  it("truncates the drill path from the breadcrumb", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/performance");

    render(<App />);

    const table = await screen.findByRole("region", {
      name: "投放分析明细表",
    });
    await user.click(within(table).getByRole("button", { name: "Meta Ads" }));
    await user.click(
      within(table).getByRole("button", { name: "Meta Ads Growth Account" }),
    );

    const breadcrumb = screen.getByRole("navigation", { name: "投放分析路径" });
    await user.click(within(breadcrumb).getByRole("button", { name: "全部数据" }));

    expect(
      within(breadcrumb).queryByText("Platform / Meta Ads"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Platform", { selector: ".performance-current-dimension" }))
      .toBeInTheDocument();
  });

  it("continues after a clicked noncontiguous breadcrumb dimension", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/performance");

    render(<App />);

    await user.click(
      await screen.findByRole("button", { name: "Campaign" }),
    );
    const table = screen.getByRole("region", { name: "投放分析明细表" });
    await user.click(
      within(table).getByRole("button", {
        name: "Meta Ads | Creator Workflow Acquisition",
      }),
    );
    await user.click(
      within(table).getByRole("button", { name: "US iOS" }),
    );

    const breadcrumb = screen.getByRole("navigation", { name: "投放分析路径" });
    await user.click(
      within(breadcrumb).getByRole("button", {
        name: "Campaign / Meta Ads | Creator Workflow Acquisition",
      }),
    );

    expect(
      screen.getByText("Ad Group", {
        selector: ".performance-current-dimension",
      }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("button", { name: "US iOS" }),
    ).toBeInTheDocument();
  });

  it("keeps contribution controls inside the module heading flow", async () => {
    window.history.pushState({}, "", "/performance");

    render(<App />);

    const contributionHeading = await screen.findByRole("heading", {
      name: "Platform 贡献排行",
    });
    const heading = contributionHeading.closest("header");
    expect(heading).not.toBeNull();
    expect(
      within(heading!).getByRole("group", { name: "选择贡献指标" }),
    ).toBeInTheDocument();
    expect(within(heading!).getByText("Top 6")).toBeInTheDocument();
  });

  it("searches and sorts the performance drill table", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/performance");

    render(<App />);

    const search = await screen.findByRole("searchbox", {
      name: "搜索当前维度",
    });
    const table = screen.getByRole("region", { name: "投放分析明细表" });

    await user.type(search, "meta");
    expect(within(table).getByRole("button", { name: "Meta Ads" }))
      .toBeInTheDocument();
    expect(
      within(table).queryByRole("button", { name: "Google Ads" }),
    ).not.toBeInTheDocument();

    await user.clear(search);
    expect(within(table).getByRole("button", { name: /展示/ }))
      .toBeInTheDocument();
    expect(within(table).getByRole("button", { name: /点击/ }))
      .toBeInTheDocument();
    expect(within(table).getByRole("button", { name: /注册/ }))
      .toBeInTheDocument();
    expect(within(table).getByRole("button", { name: /付费价值/ }))
      .toBeInTheDocument();
    expect(within(table).getByRole("button", { name: /D0 ROAS/ }))
      .toBeInTheDocument();
    expect(within(table).getByRole("button", { name: /D1 留存/ }))
      .toBeInTheDocument();
    expect(within(table).getByRole("button", { name: /D7 留存/ }))
      .toBeInTheDocument();

    const spendSort = within(table).getByRole("button", { name: /花费 Spend/ });
    await user.click(spendSort);
    expect(spendSort.closest("th")).toHaveAttribute("aria-sort", "ascending");
    await user.click(spendSort);
    expect(spendSort.closest("th")).toHaveAttribute("aria-sort", "descending");
  });

  it("renders the creative analysis route with real creative images", async () => {
    window.history.pushState({}, "", "/creatives");

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "素材分析" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Video" })).toBeInTheDocument();

    const expectedRows = filterAndSortCreatives(
      groupCreatives(mockRecords),
      createDefaultCreativeFilters(),
    );
    const images = screen.getAllByRole("img", { name: /素材缩略图/ });
    expect(images).toHaveLength(expectedRows.length);
    expect(images[0]).toHaveAttribute(
      "alt",
      `${expectedRows[0].creative} 素材缩略图`,
    );
    expect(
      images.every((image) =>
        [
          "/creative-thumbnails/creator-workflow.webp",
          "/creative-thumbnails/finance-tracker.webp",
          "/creative-thumbnails/wellness-routine.webp",
        ].some((path) => image.getAttribute("src")?.endsWith(path)),
      ),
    ).toBe(true);
  });

  it("filters creatives by status, type, platform, and search", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/creatives");
    const rows = groupCreatives(mockRecords);
    const target = rows.find(
      (row) => row.type === "Image" && row.status === "较差",
    );
    expect(target).toBeDefined();

    render(<App />);

    await screen.findByRole("heading", { name: "素材分析" });
    await user.selectOptions(screen.getByLabelText("素材平台"), target!.platform);
    await user.selectOptions(screen.getByLabelText("素材类型"), target!.type);
    await user.selectOptions(screen.getByLabelText("素材状态"), target!.status);
    await user.type(screen.getByRole("searchbox", { name: "搜索素材" }), target!.creative);

    const list = screen.getByRole("region", { name: "素材表现列表" });
    expect(
      within(list).getByRole("button", { name: `选择 ${target!.creative}` }),
    ).toBeInTheDocument();
    expect(
      within(list).getAllByRole("button", { name: /^选择 / }),
    ).toHaveLength(1);
  });

  it.each([
    ["spend-desc", "Spend 降序"],
    ["ctr-desc", "CTR 降序"],
    ["cpi-asc", "CPI 升序"],
    ["activation-rate-desc", "Activation Rate 降序"],
    ["d7-roas-desc", "D7 ROAS 降序"],
  ] as const)("sorts creatives with the %s option", async (sort, label) => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/creatives");
    render(<App />);

    await screen.findByRole("heading", { name: "素材分析" });
    await user.selectOptions(screen.getByLabelText("素材排序"), sort);

    const expected = filterAndSortCreatives(groupCreatives(mockRecords), {
      ...createDefaultCreativeFilters(),
      sort: sort as CreativeSort,
    });
    const selectionButtons = within(
      screen.getByRole("region", { name: "素材表现列表" }),
    ).getAllByRole("button", { name: /^选择 / });

    expect(screen.getByLabelText("素材排序")).toHaveDisplayValue(label);
    expect(selectionButtons[0]).toHaveAccessibleName(
      `选择 ${expected[0].creative}`,
    );
  });

  it("changes the selected creative trend heading and aria summary", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/creatives");
    render(<App />);

    const list = await screen.findByRole("region", { name: "素材表现列表" });
    const selectionButtons = within(list).getAllByRole("button", {
      name: /^选择 /,
    });
    const secondCreative = selectionButtons[1]
      .getAttribute("aria-label")!
      .replace("选择 ", "");

    await user.click(selectionButtons[1]);

    expect(
      screen.getByRole("heading", { name: `${secondCreative} 趋势` }),
    ).toBeInTheDocument();
    const trendPanel = screen
      .getByRole("heading", { name: `${secondCreative} 趋势` })
      .closest("aside");
    expect(trendPanel).not.toBeNull();
    expect(
      within(trendPanel!).getByRole("img", {
        name: (name) => name.startsWith(`${secondCreative} 每日趋势`),
      }),
    ).toBeInTheDocument();
  });

  it("updates the creative list when a global filter changes", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/creatives");
    render(<App />);

    await screen.findByRole("heading", { name: "素材分析" });
    await user.selectOptions(
      screen.getByLabelText("平台 Platform"),
      "LinkedIn Ads",
    );

    const expected = groupCreatives(
      mockRecords.filter(({ platform }) => platform === "LinkedIn Ads"),
    );
    expect(
      within(screen.getByRole("region", { name: "素材表现列表" })).getAllByRole(
        "button",
        { name: /^选择 / },
      ),
    ).toHaveLength(expected.length);
    expect(screen.getByText(`${expected.length} 个素材`)).toBeInTheDocument();
  });

  it("shows a local empty state and resets creative controls", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/creatives");
    render(<App />);

    const search = await screen.findByRole("searchbox", { name: "搜索素材" });
    await user.type(search, "not-a-real-creative");

    const emptyHeading = screen.getByRole("heading", {
      name: "没有匹配的素材",
    });
    expect(emptyHeading).toBeInTheDocument();
    const emptyState = emptyHeading.closest("section");
    expect(emptyState).not.toBeNull();
    await user.click(
      within(emptyState!).getByRole("button", { name: "重置素材筛选" }),
    );

    expect(search).toHaveValue("");
    expect(screen.getByLabelText("素材平台")).toHaveValue("");
    expect(
      screen.queryByRole("heading", { name: "没有匹配的素材" }),
    ).not.toBeInTheDocument();
  });
});
