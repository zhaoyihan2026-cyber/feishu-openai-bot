import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { DataProvider } from "../../data/DataProvider";
import { MOCK_DATA_AS_OF, mockRecords } from "../../data/mock/records";
import type { AcquisitionRecord } from "../../domain/types";
import { FilterProvider } from "../../state/FilterContext";
import { AppShell, useAppData } from "./AppShell";

interface Deferred<Value> {
  promise: Promise<Value>;
  resolve: (value: Value) => void;
  reject: (reason: unknown) => void;
}

function createDeferred<Value>(): Deferred<Value> {
  let resolve!: (value: Value) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

function createProvider(
  getRecords: DataProvider["getRecords"],
): DataProvider {
  return { getRecords };
}

function AppDataConsumer() {
  const {
    dataSource,
    error,
    filteredRecords,
    loading,
    mockAsOfTimestamp,
    records,
  } = useAppData();

  return (
    <section aria-label="outlet content">
      <output aria-label="mock data as of">{mockAsOfTimestamp}</output>
      <output aria-label="data source type">{dataSource.type}</output>
      <output aria-label="data source label">{dataSource.label}</output>
      <output aria-label="record ids">
        {records.map(({ id }) => id).join(",")}
      </output>
      <output aria-label="filtered record ids">
        {filteredRecords.map(({ id }) => id).join(",")}
      </output>
      <output aria-label="loading state">{String(loading)}</output>
      <output aria-label="error state">{error?.message ?? "none"}</output>
    </section>
  );
}

function renderShell(dataProvider: DataProvider) {
  return render(
    <FilterProvider>
      <MemoryRouter>
        <Routes>
          <Route element={<AppShell dataProvider={dataProvider} />}>
            <Route index element={<AppDataConsumer />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </FilterProvider>,
  );
}

describe("AppShell", () => {
  it("does not mount outlet content while records are loading", () => {
    const pending = createDeferred<AcquisitionRecord[]>();

    renderShell(createProvider(() => pending.promise));

    expect(
      screen.getByRole("heading", { name: "正在加载投放数据" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("outlet content")).not.toBeInTheDocument();
  });

  it("renders an error without mounting outlet content when loading rejects", async () => {
    renderShell(
      createProvider(() => Promise.reject(new Error("数据服务不可用"))),
    );

    expect(
      await screen.findByRole("heading", { name: "投放数据加载失败" }),
    ).toBeInTheDocument();
    expect(screen.getByText("数据服务不可用")).toBeInTheDocument();
    expect(screen.queryByLabelText("outlet content")).not.toBeInTheDocument();
  });

  it("retries a failed load and mounts the outlet after success", async () => {
    const user = userEvent.setup();
    const retry = createDeferred<AcquisitionRecord[]>();
    let attempt = 0;
    const provider = createProvider(() => {
      attempt += 1;
      return attempt === 1
        ? Promise.reject(new Error("首次加载失败"))
        : retry.promise;
    });

    renderShell(provider);

    await user.click(await screen.findByRole("button", { name: "重试" }));

    expect(
      screen.getByRole("heading", { name: "正在加载投放数据" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("outlet content")).not.toBeInTheDocument();

    retry.resolve(mockRecords.slice(0, 2));

    expect(
      await screen.findByRole("region", { name: "outlet content" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("loading state")).toHaveTextContent("false");
    expect(screen.getByLabelText("error state")).toHaveTextContent("none");
  });

  it("provides successful records, filtered records, and snapshot metadata", async () => {
    const user = userEvent.setup();
    const records = mockRecords.filter(
      ({ app }) => app === "Creator Workflow" || app === "Finance Tracker",
    );
    const getRecords = vi.fn(() => Promise.resolve(records));
    const provider = createProvider(getRecords);

    renderShell(provider);

    expect(await screen.findByLabelText("record ids")).toHaveTextContent(
      records[0].id,
    );
    expect(screen.getByLabelText("mock data as of")).toHaveTextContent(
      MOCK_DATA_AS_OF,
    );
    expect(screen.getByLabelText("data source type")).toHaveTextContent("mock");
    expect(screen.getByLabelText("data source label")).toHaveTextContent(
      "MockDataProvider",
    );

    await user.selectOptions(
      screen.getByLabelText("应用 App"),
      "Creator Workflow",
    );

    const expectedIds = records
      .filter(({ app }) => app === "Creator Workflow")
      .map(({ id }) => id)
      .join(",");
    expect(screen.getByLabelText("filtered record ids")).toHaveTextContent(
      expectedIds,
    );
    expect(screen.getByLabelText("filtered record ids")).not.toHaveTextContent(
      records.find(({ app }) => app === "Finance Tracker")!.id,
    );
    expect(getRecords).toHaveBeenCalledTimes(1);
  });

  it("ignores stale provider completion after the provider changes", async () => {
    const staleLoad = createDeferred<AcquisitionRecord[]>();
    const currentLoad = createDeferred<AcquisitionRecord[]>();
    const staleRecord = { ...mockRecords[0], id: "stale-record" };
    const currentRecord = { ...mockRecords[1], id: "current-record" };
    const staleGetRecords = vi.fn(() => staleLoad.promise);
    const currentGetRecords = vi.fn(() => currentLoad.promise);
    const staleProvider = createProvider(staleGetRecords);
    const currentProvider = createProvider(currentGetRecords);
    const { rerender } = renderShell(staleProvider);

    rerender(
      <FilterProvider>
        <MemoryRouter>
          <Routes>
            <Route
              element={
                <AppShell dataProvider={currentProvider} />
              }
            >
              <Route index element={<AppDataConsumer />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </FilterProvider>,
    );

    currentLoad.resolve([currentRecord]);
    expect(await screen.findByLabelText("record ids")).toHaveTextContent(
      "current-record",
    );

    staleLoad.resolve([staleRecord]);
    await waitFor(() => {
      expect(screen.getByLabelText("record ids")).toHaveTextContent(
        "current-record",
      );
    });
    expect(screen.getByLabelText("record ids")).not.toHaveTextContent(
      "stale-record",
    );
    expect(staleGetRecords).toHaveBeenCalledTimes(1);
    expect(currentGetRecords).toHaveBeenCalledTimes(1);
  });

  it("ignores provider completion after unmount", async () => {
    const pending = createDeferred<AcquisitionRecord[]>();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = renderShell(createProvider(() => pending.promise));

    unmount();
    await act(async () => {
      pending.resolve(mockRecords.slice(0, 1));
      await pending.promise;
    });

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
