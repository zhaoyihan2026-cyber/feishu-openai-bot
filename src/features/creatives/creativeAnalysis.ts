import { aggregateMetrics } from "../../domain/metrics";
import type { AcquisitionRecord, Platform } from "../../domain/types";

export type CreativeStatus = "优秀" | "观察" | "较差";
export type CreativeSort =
  | "spend-desc"
  | "ctr-desc"
  | "cpi-asc"
  | "activation-rate-desc"
  | "d7-roas-desc";

export interface CreativeSummary {
  creative: string;
  platform: Platform;
  campaign: string;
  adGroup: string;
  type: AcquisitionRecord["creativeType"];
  thumbnail: string;
  status: CreativeStatus;
  impressions: number;
  clicks: number;
  installs: number;
  activations: number;
  spendUsd: number;
  revenueD7Usd: number;
  ctr: number;
  cpi: number;
  activationRate: number;
  d7Roas: number;
}

export interface CreativeFilters {
  platform: Platform | "";
  type: AcquisitionRecord["creativeType"] | "";
  status: CreativeStatus | "";
  search: string;
  sort: CreativeSort;
}

export interface CreativeDailyPoint {
  date: string;
  spendUsd: number;
  cpi: number;
  d7Roas: number;
}

export function createDefaultCreativeFilters(): CreativeFilters {
  return {
    platform: "",
    type: "",
    status: "",
    search: "",
    sort: "spend-desc",
  };
}

export function getCreativeStatus({
  d7Roas,
  cpi,
}: Pick<CreativeSummary, "d7Roas" | "cpi">): CreativeStatus {
  if (d7Roas >= 0.5 && cpi <= 2.5) {
    return "优秀";
  }
  if (d7Roas < 0.3 || cpi > 3.5) {
    return "较差";
  }
  return "观察";
}

export function groupCreatives(
  records: readonly AcquisitionRecord[],
): CreativeSummary[] {
  const groups = new Map<string, AcquisitionRecord[]>();
  for (const record of records) {
    const group = groups.get(record.creative);
    if (group) {
      group.push(record);
    } else {
      groups.set(record.creative, [record]);
    }
  }

  return [...groups].map(([creative, groupRecords]) => {
    const identity = groupRecords[0];
    const metrics = aggregateMetrics(groupRecords);
    return {
      creative,
      platform: identity.platform,
      campaign: identity.campaign,
      adGroup: identity.adGroup,
      type: identity.creativeType,
      thumbnail: identity.thumbnail,
      status: getCreativeStatus(metrics),
      impressions: metrics.impressions,
      clicks: metrics.clicks,
      installs: metrics.installs,
      activations: metrics.activations,
      spendUsd: metrics.spendUsd,
      revenueD7Usd: metrics.revenueD7Usd,
      ctr: metrics.ctr,
      cpi: metrics.cpi,
      activationRate: metrics.activationRate,
      d7Roas: metrics.d7Roas,
    };
  });
}

function compareCreatives(
  left: CreativeSummary,
  right: CreativeSummary,
  sort: CreativeSort,
): number {
  let difference = 0;
  switch (sort) {
    case "spend-desc":
      difference = right.spendUsd - left.spendUsd;
      break;
    case "ctr-desc":
      difference = right.ctr - left.ctr;
      break;
    case "cpi-asc":
      difference = left.cpi - right.cpi;
      break;
    case "activation-rate-desc":
      difference = right.activationRate - left.activationRate;
      break;
    case "d7-roas-desc":
      difference = right.d7Roas - left.d7Roas;
      break;
  }
  return difference || left.creative.localeCompare(right.creative, "en");
}

export function filterAndSortCreatives(
  rows: readonly CreativeSummary[],
  filters: CreativeFilters,
): CreativeSummary[] {
  const query = filters.search.trim().toLocaleLowerCase();
  return rows
    .filter(
      (row) =>
        (!filters.platform || row.platform === filters.platform) &&
        (!filters.type || row.type === filters.type) &&
        (!filters.status || row.status === filters.status) &&
        (!query ||
          [row.creative, row.platform, row.campaign, row.adGroup, row.type]
            .join(" ")
            .toLocaleLowerCase()
            .includes(query)),
    )
    .sort((left, right) => compareCreatives(left, right, filters.sort));
}

export function resolveSelectedCreative(
  visibleRows: readonly CreativeSummary[],
  selectedCreative: string | null,
): string | null {
  if (
    selectedCreative &&
    visibleRows.some(({ creative }) => creative === selectedCreative)
  ) {
    return selectedCreative;
  }
  return visibleRows[0]?.creative ?? null;
}

export function buildCreativeDailySeries(
  records: readonly AcquisitionRecord[],
  creative: string | null,
): CreativeDailyPoint[] {
  if (!creative) {
    return [];
  }

  const dates = [...new Set(records.map(({ date }) => date))].sort();
  const selected = records.filter((record) => record.creative === creative);
  const recordsByDate = new Map<string, AcquisitionRecord[]>();
  for (const record of selected) {
    const dailyRecords = recordsByDate.get(record.date);
    if (dailyRecords) {
      dailyRecords.push(record);
    } else {
      recordsByDate.set(record.date, [record]);
    }
  }

  return dates.map((date) => {
    const metrics = aggregateMetrics(recordsByDate.get(date) ?? []);
    return {
      date,
      spendUsd: metrics.spendUsd,
      cpi: metrics.cpi,
      d7Roas: metrics.d7Roas,
    };
  });
}
