import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable, type DataTableColumn } from "./DataTable";

interface CampaignRow {
  id: string;
  campaign: string;
  spend: number;
}

const columns: DataTableColumn<CampaignRow>[] = [
  {
    id: "campaign",
    header: "Campaign",
    cell: (row) => row.campaign,
    sortValue: (row) => row.campaign,
    sortable: true,
  },
  {
    id: "spend",
    header: "Spend",
    cell: (row) => `$${row.spend}`,
    sortValue: (row) => row.spend,
    sortable: true,
  },
];

const rows: CampaignRow[] = [
  { id: "growth", campaign: "Growth", spend: 420 },
  { id: "launch", campaign: "Launch", spend: 120 },
];

function renderedCampaigns(): string[] {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0].textContent ?? "");
}

describe("DataTable", () => {
  it("sorts rows by sortable column in both directions", async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Spend" }));
    expect(renderedCampaigns()).toEqual(["Launch", "Growth"]);
    expect(screen.getByRole("columnheader", { name: "Spend" })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );

    await user.click(screen.getByRole("button", { name: "Spend" }));
    expect(renderedCampaigns()).toEqual(["Growth", "Launch"]);
    expect(screen.getByRole("columnheader", { name: "Spend" })).toHaveAttribute(
      "aria-sort",
      "descending",
    );
  });

  it("renders a single accessible empty row", () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        getRowKey={(row) => row.id}
        emptyMessage="No campaigns"
      />,
    );

    expect(screen.getByText("No campaigns")).toHaveAttribute("colspan", "2");
  });

  it("exposes the scroll container as a named focusable region", () => {
    render(
      <DataTable
        ariaLabel="Campaign performance"
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
      />,
    );

    expect(
      screen.getByRole("region", { name: "Campaign performance" }),
    ).toHaveAttribute("tabindex", "0");
  });
});
