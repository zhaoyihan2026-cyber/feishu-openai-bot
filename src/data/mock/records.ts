import type { AcquisitionRecord, Platform } from "../../domain/types";

const DAY_MS = 86_400_000;
const START_DATE = "2026-05-08";
const TOTAL_DAYS = 30;
const CURRENT_PERIOD_START_DAY = 15;

export const MOCK_DATA_AS_OF = "2026-06-08T12:00:00Z";

interface PeriodValues {
  previous: number;
  current: number;
}

interface PlatformConfig {
  platform: Platform;
  slug: string;
  updatedAt: string;
  cpi: PeriodValues;
  d7Roas: PeriodValues;
  budgetPace: PeriodValues;
}

const platformConfigs = [
  {
    platform: "Meta Ads",
    slug: "meta",
    updatedAt: "2026-06-08T10:00:00Z",
    cpi: { previous: 2.6, current: 3.38 },
    d7Roas: { previous: 0.55, current: 0.55 },
    budgetPace: { previous: 0.82, current: 0.9 },
  },
  {
    platform: "Google Ads",
    slug: "google",
    updatedAt: "2026-06-08T09:00:00Z",
    cpi: { previous: 2.2, current: 2.2 },
    d7Roas: { previous: 0.68, current: 0.68 },
    budgetPace: { previous: 0.84, current: 0.92 },
  },
  {
    platform: "TikTok Ads",
    slug: "tiktok",
    updatedAt: "2026-06-08T08:00:00Z",
    cpi: { previous: 2.7, current: 2.7 },
    d7Roas: { previous: 0.55, current: 0.4 },
    budgetPace: { previous: 0.8, current: 0.88 },
  },
  {
    platform: "Microsoft Ads",
    slug: "microsoft",
    updatedAt: "2026-06-08T07:00:00Z",
    cpi: { previous: 3, current: 3 },
    d7Roas: { previous: 0.48, current: 0.48 },
    budgetPace: { previous: 0.82, current: 1.18 },
  },
  {
    platform: "LinkedIn Ads",
    slug: "linkedin",
    updatedAt: "2026-06-06T08:00:00Z",
    cpi: { previous: 4.2, current: 4.2 },
    d7Roas: { previous: 0.56, current: 0.56 },
    budgetPace: { previous: 0.78, current: 0.86 },
  },
  {
    platform: "X Ads",
    slug: "x",
    updatedAt: "2026-06-07T18:00:00Z",
    cpi: { previous: 3.3, current: 3.3 },
    d7Roas: { previous: 0.45, current: 0.45 },
    budgetPace: { previous: 0.8, current: 0.9 },
  },
] as const satisfies readonly PlatformConfig[];

const apps = [
  {
    name: "Creator Workflow",
    thumbnail: "/creative-thumbnails/creator-workflow.webp",
  },
  {
    name: "Finance Tracker",
    thumbnail: "/creative-thumbnails/finance-tracker.webp",
  },
  {
    name: "Wellness Routine",
    thumbnail: "/creative-thumbnails/wellness-routine.webp",
  },
] as const;

const operatingSystems = ["iOS", "Android"] as const;
const countries = ["US", "CA", "GB", "DE", "JP", "BR"] as const;
const creativeTypes = ["Video", "Image", "Playable"] as const;

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function periodValue(values: PeriodValues, dayIndex: number): number {
  return dayIndex < CURRENT_PERIOD_START_DAY
    ? values.previous
    : values.current;
}

function createRecord(
  dayIndex: number,
  platformIndex: number,
): AcquisitionRecord {
  const config = platformConfigs[platformIndex];
  const date = addDays(START_DATE, dayIndex);
  const app = apps[(dayIndex + platformIndex) % apps.length];
  const os =
    operatingSystems[
      (Math.floor(dayIndex / apps.length) + platformIndex) %
        operatingSystems.length
    ];
  const country = countries[(dayIndex + platformIndex) % countries.length];
  const creativeType =
    creativeTypes[(dayIndex + platformIndex) % creativeTypes.length];
  const campaign = `${config.platform} | ${app.name} Acquisition`;
  const adGroup = `${country} ${os}`;
  const creative =
    `${config.platform} | ${app.name} | ${creativeType} | ${adGroup}`;
  const impressions =
    11_000 +
    platformIndex * 1_500 +
    (dayIndex % 7) * 420 +
    (dayIndex % apps.length) * 650;
  const clicks = Math.round(
    impressions *
      (0.025 + platformIndex * 0.0015 + (dayIndex % apps.length) * 0.001),
  );
  const installs =
    95 +
    platformIndex * 14 +
    (dayIndex % apps.length) * 11 +
    (dayIndex % 5) * 4 +
    (os === "Android" ? 6 : 0);
  const cpi = periodValue(config.cpi, dayIndex);
  const d7Roas = periodValue(config.d7Roas, dayIndex);
  const budgetPace = periodValue(config.budgetPace, dayIndex);
  const spendUsd = roundCurrency(installs * cpi);

  return {
    id: `${date}-${config.slug}`,
    date,
    updatedAt: config.updatedAt,
    app: app.name,
    platform: config.platform,
    account: `${config.platform} Growth Account`,
    country,
    os,
    campaign,
    adGroup,
    creative,
    creativeType,
    thumbnail: app.thumbnail,
    impressions,
    clicks,
    installs,
    activations: Math.round(
      installs * (0.58 + (dayIndex % apps.length) * 0.04),
    ),
    payers: Math.round(
      installs * (0.08 + (dayIndex % apps.length) * 0.015),
    ),
    spendUsd,
    revenueD7Usd: roundCurrency(spendUsd * d7Roas),
    revenueD30Usd: roundCurrency(spendUsd * (d7Roas + 0.46)),
    budgetUsd: roundCurrency(spendUsd / budgetPace),
  };
}

export const mockRecords: AcquisitionRecord[] = Array.from(
  { length: TOTAL_DAYS },
  (_, dayIndex) =>
    platformConfigs.map((_, platformIndex) =>
      createRecord(dayIndex, platformIndex),
    ),
).flat();
