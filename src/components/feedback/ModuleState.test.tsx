import { render, screen } from "@testing-library/react";
import { ModuleState } from "./ModuleState";

describe("ModuleState", () => {
  it("announces errors assertively and renders an optional action", () => {
    render(
      <ModuleState
        variant="error"
        title="数据加载失败"
        message="请稍后重试。"
        action={<button type="button">重试</button>}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("数据加载失败");
    expect(screen.getByRole("button", { name: "重试" })).toBeInTheDocument();
  });

  it("marks loading feedback as a busy status", () => {
    render(
      <ModuleState
        variant="loading"
        title="正在加载"
        message="正在获取投放数据。"
      />,
    );

    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });
});
