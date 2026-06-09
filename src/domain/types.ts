export type Platform =
  | "Meta Ads"
  | "Google Ads"
  | "TikTok Ads"
  | "Microsoft Ads"
  | "LinkedIn Ads"
  | "X Ads";

export interface AcquisitionRecord {
  id: string;
  date: string;
  updatedAt: string;
  app: string;
  platform: Platform;
  account: string;
  country: string;
  os: "iOS" | "Android";
  campaign: string;
  adGroup: string;
  creative: string;
  creativeType: "Video" | "Image" | "Playable";
  thumbnail: string;
  impressions: number;
  clicks: number;
  installs: number;
  activations: number;
  payers: number;
  spendUsd: number;
  revenueD7Usd: number;
  revenueD30Usd: number;
  budgetUsd: number;
}

export interface Metrics {
  impressions: number;
  clicks: number;
  installs: number;
  activations: number;
  payers: number;
  spendUsd: number;
  revenueD7Usd: number;
  revenueD30Usd: number;
  ctr: number;
  cpi: number;
  activationRate: number;
  payerRate: number;
  d7Roas: number;
  d30Ltv: number;
}
