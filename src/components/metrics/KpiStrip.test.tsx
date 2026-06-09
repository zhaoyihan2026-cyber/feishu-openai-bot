import { render, screen } from "@testing-library/react";
import { KpiStrip } from "./KpiStrip";

describe("KpiStrip", () => {
  it("exposes semantic status without coupling items to dashboard metrics", () => {
    render(
      <KpiStrip
        items={[
          {
            id: "roas",
            label: "D7 ROAS",
            value: "128%",
            comparison: "较上期 +8.2%",
            status: "positive",
          },
          {
            id: "cpi",
            label: "CPI",
            value: "$4.20",
            status: "warning",
          },
        ]}
      />,
    );

    expect(screen.getByText("D7 ROAS").closest("li")).toHaveAttribute(
      "data-status",
      "positive",
    );
    expect(screen.getByText("CPI").closest("li")).toHaveAttribute(
      "data-status",
      "warning",
    );
    expect(screen.getByText("较上期 +8.2%")).toBeInTheDocument();
  });

  it("renders numeric and string zero comparisons", () => {
    render(
      <KpiStrip
        items={[
          {
            id: "numeric-zero",
            label: "Numeric",
            value: "1",
            comparison: 0,
          },
          {
            id: "string-zero",
            label: "String",
            value: "2",
            comparison: "0",
          },
        ]}
      />,
    );

    expect(screen.getAllByText("0")).toHaveLength(2);
  });

  it("announces each KPI status in Chinese", () => {
    render(
      <KpiStrip
        items={[
          { id: "positive", label: "正向指标", value: "1", status: "positive" },
          { id: "negative", label: "负向指标", value: "2", status: "negative" },
          { id: "warning", label: "预警指标", value: "3", status: "warning" },
          { id: "neutral", label: "中性指标", value: "4", status: "neutral" },
        ]}
      />,
    );

    for (const statusText of [
      "状态：正向",
      "状态：负向",
      "状态：预警",
      "状态：中性",
    ]) {
      expect(screen.getByText(statusText)).toHaveClass("visually-hidden");
    }
  });
});
