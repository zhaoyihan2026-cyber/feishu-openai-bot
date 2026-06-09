import type { AcquisitionRecord, Platform } from "./types";

export interface FilterState {
  dateFrom: string;
  dateTo: string;
  apps: string[];
  platforms: Platform[];
  accounts: string[];
  countries: string[];
  operatingSystems: Array<"iOS" | "Android">;
}

export type ReadonlyFilterState = {
  readonly [Key in keyof FilterState]: FilterState[Key] extends Array<
    infer Value
  >
    ? readonly Value[]
    : FilterState[Key];
};

export const DEFAULT_FILTERS: ReadonlyFilterState = Object.freeze({
  dateFrom: "2026-05-08",
  dateTo: "2026-06-06",
  apps: Object.freeze([] as string[]),
  platforms: Object.freeze([] as Platform[]),
  accounts: Object.freeze([] as string[]),
  countries: Object.freeze([] as string[]),
  operatingSystems: Object.freeze([] as Array<"iOS" | "Android">),
});

export function createDefaultFilters(): FilterState {
  return {
    dateFrom: DEFAULT_FILTERS.dateFrom,
    dateTo: DEFAULT_FILTERS.dateTo,
    apps: [...DEFAULT_FILTERS.apps],
    platforms: [...DEFAULT_FILTERS.platforms],
    accounts: [...DEFAULT_FILTERS.accounts],
    countries: [...DEFAULT_FILTERS.countries],
    operatingSystems: [...DEFAULT_FILTERS.operatingSystems],
  };
}

function includesSelected<T>(selection: readonly T[], value: T): boolean {
  return selection.length === 0 || selection.includes(value);
}

export function filterRecords(
  records: readonly AcquisitionRecord[],
  filters: ReadonlyFilterState,
): AcquisitionRecord[] {
  return records.filter(
    (record) =>
      record.date >= filters.dateFrom &&
      record.date <= filters.dateTo &&
      includesSelected(filters.apps, record.app) &&
      includesSelected(filters.platforms, record.platform) &&
      includesSelected(filters.accounts, record.account) &&
      includesSelected(filters.countries, record.country) &&
      includesSelected(filters.operatingSystems, record.os),
  );
}
