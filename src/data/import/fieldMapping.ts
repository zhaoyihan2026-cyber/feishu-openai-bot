import type { AcquisitionRecord, Platform } from "../../domain/types";
import type { HeaderMappingResult, ImportField } from "./types";

export const REQUIRED_IMPORT_FIELDS: ImportField[] = [
  "date",
  "platform",
  "spendUsd",
  "impressions",
  "clicks",
  "installs",
];

const fieldAliases: Partial<Record<ImportField, string[]>> = {
  date: ["date", "day", "日期", "时间", "reportingdate"],
  updatedAt: ["updatedat", "lastupdated", "更新时间", "数据更新时间"],
  app: ["app", "application", "appname", "应用", "应用名称"],
  platform: ["platform", "network", "channel", "media", "媒体", "平台", "渠道"],
  account: ["account", "accountname", "adaccount", "账户", "广告账户"],
  country: ["country", "geo", "region", "国家", "地区"],
  os: ["os", "operatingsystem", "system", "操作系统", "系统"],
  campaign: ["campaign", "campaignname", "广告系列", "广告活动"],
  adGroup: ["adgroup", "adgroupname", "adset", "adsetname", "广告组"],
  creative: ["creative", "creativename", "adname", "素材", "广告名称"],
  creativeType: ["creativetype", "type", "format", "素材类型", "广告形式"],
  thumbnail: ["thumbnail", "thumbnailurl", "image", "素材图", "缩略图"],
  impressions: [
    "impressions",
    "impr",
    "展示",
    "展示量",
    "展示次数",
    "曝光",
    "曝光量",
    "曝光次数",
  ],
  clicks: ["clicks", "click", "点击", "点击量", "点击次数"],
  installs: [
    "installs",
    "install",
    "首次安装",
    "安装",
    "安装量",
    "安装人数",
  ],
  activations: [
    "activations",
    "activation",
    "激活",
    "激活数",
    "激活量",
    "注册人数",
  ],
  payers: ["payers", "payingusers", "付费用户", "付费人数"],
  spendUsd: ["spend", "cost", "spendusd", "消耗", "花费", "成本"],
  revenueD7Usd: [
    "revenued7",
    "d7revenue",
    "d7revenueusd",
    "d7收入",
    "7日收入",
    "付费价值",
  ],
  revenueD30Usd: [
    "revenued30",
    "d30revenue",
    "d30revenueusd",
    "d30收入",
    "30日收入",
  ],
  budgetUsd: ["budget", "budgetusd", "预算"],
};

const platformAliases: Record<string, Platform> = {
  meta: "Meta Ads",
  metaads: "Meta Ads",
  facebook: "Meta Ads",
  fb: "Meta Ads",
  google: "Google Ads",
  googleads: "Google Ads",
  adwords: "Google Ads",
  tiktok: "TikTok Ads",
  tiktokads: "TikTok Ads",
  tt: "TikTok Ads",
  microsoft: "Microsoft Ads",
  microsoftads: "Microsoft Ads",
  bing: "Microsoft Ads",
  bingads: "Microsoft Ads",
  linkedin: "LinkedIn Ads",
  linkedinads: "LinkedIn Ads",
  x: "X Ads",
  xads: "X Ads",
  twitter: "X Ads",
};

const osAliases: Record<string, AcquisitionRecord["os"]> = {
  android: "Android",
  ios: "iOS",
  iphone: "iOS",
  ipad: "iOS",
};

const creativeTypeAliases: Record<string, AcquisitionRecord["creativeType"]> = {
  video: "Video",
  image: "Image",
  img: "Image",
  banner: "Image",
  playable: "Playable",
  playablead: "Playable",
};

function normalizeToken(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-.():：（）]/g, "");
}

const aliasToField = new Map<string, ImportField>(
  Object.entries(fieldAliases).flatMap(([field, aliases]) =>
    (aliases ?? []).map((alias) => [normalizeToken(alias), field as ImportField]),
  ),
);

export function mapHeaders(headers: string[]): HeaderMappingResult {
  const mappedFields: Partial<Record<ImportField, string>> = {};
  const unmappedHeaders: string[] = [];

  for (const header of headers) {
    const field = aliasToField.get(normalizeToken(header));
    if (field && !mappedFields[field]) {
      mappedFields[field] = header;
    } else if (!field) {
      unmappedHeaders.push(header);
    }
  }

  return {
    mappedFields,
    unmappedHeaders,
    missingRequiredFields: REQUIRED_IMPORT_FIELDS.filter(
      (field) => !mappedFields[field],
    ),
  };
}

export function normalizePlatform(value: unknown): Platform | null {
  return platformAliases[normalizeToken(value)] ?? null;
}

export function normalizeOs(value: unknown): AcquisitionRecord["os"] | null {
  return osAliases[normalizeToken(value)] ?? null;
}

export function normalizeCreativeType(
  value: unknown,
): AcquisitionRecord["creativeType"] | null {
  return creativeTypeAliases[normalizeToken(value)] ?? null;
}
