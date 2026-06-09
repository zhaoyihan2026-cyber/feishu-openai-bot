import { RotateCcw } from "lucide-react";
import { useId, useMemo } from "react";
import type { AcquisitionRecord, Platform } from "../../domain/types";
import { useFilters } from "../../state/FilterContext";

interface GlobalFiltersProps {
  records: AcquisitionRecord[];
}

function uniqueSorted<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort((left, right) =>
    left.localeCompare(right, "en"),
  );
}

export function GlobalFilters({ records }: GlobalFiltersProps) {
  const idPrefix = useId();
  const { filters, resetFilters, setFilter } = useFilters();
  const options = useMemo(
    () => ({
      apps: uniqueSorted(records.map((record) => record.app)),
      platforms: uniqueSorted(records.map((record) => record.platform)),
      accounts: uniqueSorted(records.map((record) => record.account)),
      countries: uniqueSorted(records.map((record) => record.country)),
      operatingSystems: uniqueSorted(records.map((record) => record.os)),
    }),
    [records],
  );

  return (
    <section aria-label="全局筛选 Global filters">
      <label htmlFor={`${idPrefix}-date-from`}>开始日期 From</label>
      <input
        id={`${idPrefix}-date-from`}
        type="date"
        value={filters.dateFrom}
        onChange={(event) => setFilter("dateFrom", event.target.value)}
      />

      <label htmlFor={`${idPrefix}-date-to`}>结束日期 To</label>
      <input
        id={`${idPrefix}-date-to`}
        type="date"
        value={filters.dateTo}
        onChange={(event) => setFilter("dateTo", event.target.value)}
      />

      <label htmlFor={`${idPrefix}-app`}>应用 App</label>
      <select
        id={`${idPrefix}-app`}
        value={filters.apps[0] ?? ""}
        onChange={(event) =>
          setFilter("apps", event.target.value ? [event.target.value] : [])
        }
      >
        <option value="">全部 All</option>
        {options.apps.map((app) => (
          <option key={app} value={app}>
            {app}
          </option>
        ))}
      </select>

      <label htmlFor={`${idPrefix}-platform`}>平台 Platform</label>
      <select
        id={`${idPrefix}-platform`}
        value={filters.platforms[0] ?? ""}
        onChange={(event) =>
          setFilter(
            "platforms",
            event.target.value ? [event.target.value as Platform] : [],
          )
        }
      >
        <option value="">全部 All</option>
        {options.platforms.map((platform) => (
          <option key={platform} value={platform}>
            {platform}
          </option>
        ))}
      </select>

      <label htmlFor={`${idPrefix}-account`}>账户 Account</label>
      <select
        id={`${idPrefix}-account`}
        value={filters.accounts[0] ?? ""}
        onChange={(event) =>
          setFilter("accounts", event.target.value ? [event.target.value] : [])
        }
      >
        <option value="">全部 All</option>
        {options.accounts.map((account) => (
          <option key={account} value={account}>
            {account}
          </option>
        ))}
      </select>

      <label htmlFor={`${idPrefix}-country`}>国家 Country</label>
      <select
        id={`${idPrefix}-country`}
        value={filters.countries[0] ?? ""}
        onChange={(event) =>
          setFilter("countries", event.target.value ? [event.target.value] : [])
        }
      >
        <option value="">全部 All</option>
        {options.countries.map((country) => (
          <option key={country} value={country}>
            {country}
          </option>
        ))}
      </select>

      <label htmlFor={`${idPrefix}-os`}>操作系统 OS</label>
      <select
        id={`${idPrefix}-os`}
        value={filters.operatingSystems[0] ?? ""}
        onChange={(event) =>
          setFilter(
            "operatingSystems",
            event.target.value
              ? [event.target.value as AcquisitionRecord["os"]]
              : [],
          )
        }
      >
        <option value="">全部 All</option>
        {options.operatingSystems.map((operatingSystem) => (
          <option key={operatingSystem} value={operatingSystem}>
            {operatingSystem}
          </option>
        ))}
      </select>

      <button
        type="button"
        aria-label="重置筛选 Reset filters"
        title="重置筛选 Reset filters"
        onClick={resetFilters}
      >
        <RotateCcw aria-hidden="true" />
      </button>
    </section>
  );
}
