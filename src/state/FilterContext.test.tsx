import { fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import type { FilterState } from "../domain/filters";
import {
  DEFAULT_FILTERS,
  FilterProvider,
  useFilters,
} from "./FilterContext";

function FilterConsumer() {
  const { filters, resetFilters, setFilter, setFilters } = useFilters();

  return (
    <>
      <output aria-label="platforms">
        {filters.platforms.join(", ") || "All platforms"}
      </output>
      <output aria-label="date from">{filters.dateFrom}</output>
      <output aria-label="date to">{filters.dateTo}</output>
      <button
        type="button"
        onClick={() => setFilter("platforms", ["Meta Ads"])}
      >
        Select Meta
      </button>
      <button
        type="button"
        onClick={() =>
          setFilters({
            dateFrom: "2026-04-01",
            dateTo: "2026-04-30",
            platforms: [],
          })
        }
      >
        Show April import
      </button>
      <button type="button" onClick={resetFilters}>
        Reset
      </button>
    </>
  );
}

function PlatformReferenceConsumer({
  observe,
}: {
  observe: (platforms: FilterState["platforms"]) => void;
}) {
  const { filters, resetFilters, setFilter } = useFilters();

  useEffect(() => {
    observe(filters.platforms);
  }, [filters.platforms, observe]);

  return (
    <>
      <button
        type="button"
        onClick={() => setFilter("platforms", ["Google Ads"])}
      >
        Select Google
      </button>
      <button type="button" onClick={resetFilters}>
        Reset references
      </button>
    </>
  );
}

describe("FilterProvider", () => {
  it("lets consumers change platforms and reset to fresh defaults", () => {
    render(
      <FilterProvider>
        <FilterConsumer />
      </FilterProvider>,
    );

    expect(screen.getByLabelText("platforms")).toHaveTextContent(
      "All platforms",
    );
    expect(screen.getByLabelText("date from")).toHaveTextContent(
      DEFAULT_FILTERS.dateFrom,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select Meta" }));
    expect(screen.getByLabelText("platforms")).toHaveTextContent("Meta Ads");

    fireEvent.click(
      screen.getByRole("button", { name: "Show April import" }),
    );
    expect(screen.getByLabelText("date from")).toHaveTextContent("2026-04-01");
    expect(screen.getByLabelText("date to")).toHaveTextContent("2026-04-30");
    expect(screen.getByLabelText("platforms")).toHaveTextContent(
      "All platforms",
    );

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByLabelText("platforms")).toHaveTextContent(
      "All platforms",
    );
    expect(screen.getByLabelText("date from")).toHaveTextContent(
      DEFAULT_FILTERS.dateFrom,
    );
  });

  it("uses fresh arrays for reset after rejecting external default mutation", () => {
    expect(Object.isFrozen(DEFAULT_FILTERS.platforms)).toBe(true);
    expect(() => {
      // @ts-expect-error Exported default selections are readonly.
      DEFAULT_FILTERS.platforms.push("Meta Ads");
    }).toThrow(TypeError);

    const observedPlatforms: FilterState["platforms"][] = [];
    render(
      <FilterProvider>
        <PlatformReferenceConsumer
          observe={(platforms) => observedPlatforms.push(platforms)}
        />
      </FilterProvider>,
    );

    const initialPlatforms = observedPlatforms.at(-1);
    fireEvent.click(screen.getByRole("button", { name: "Select Google" }));
    expect(observedPlatforms.at(-1)).toEqual(["Google Ads"]);

    fireEvent.click(
      screen.getByRole("button", { name: "Reset references" }),
    );
    const resetPlatforms = observedPlatforms.at(-1);

    expect(resetPlatforms).toEqual([]);
    expect(initialPlatforms).not.toBe(DEFAULT_FILTERS.platforms);
    expect(resetPlatforms).not.toBe(DEFAULT_FILTERS.platforms);
    expect(resetPlatforms).not.toBe(initialPlatforms);
  });
});

describe("useFilters", () => {
  it("throws a useful error outside FilterProvider", () => {
    expect(() => render(<FilterConsumer />)).toThrow(
      "useFilters must be used within a FilterProvider",
    );
  });
});
