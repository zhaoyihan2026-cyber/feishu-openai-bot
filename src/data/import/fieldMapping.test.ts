import { describe, expect, it } from "vitest";
import {
  mapHeaders,
  normalizeCreativeType,
  normalizeOs,
  normalizePlatform,
} from "./fieldMapping";

describe("fieldMapping", () => {
  it("maps common English and Chinese column aliases to standard fields", () => {
    const mapping = mapHeaders([
      "Date",
      "Campaign Name",
      "消耗",
      "展示",
      "Clicks",
      "首次安装",
      "D7 Revenue",
    ]);

    expect(mapping.mappedFields).toMatchObject({
      date: "Date",
      campaign: "Campaign Name",
      spendUsd: "消耗",
      impressions: "展示",
      clicks: "Clicks",
      installs: "首次安装",
      revenueD7Usd: "D7 Revenue",
    });
    expect(mapping.missingRequiredFields).toEqual(["platform"]);
  });

  it("maps daily agency report headers from IGS CSV exports", () => {
    const mapping = mapHeaders([
      "日期",
      "媒体",
      "国家",
      "消耗",
      "展示次数",
      "点击次数",
      "安装人数",
      "注册人数",
      "付费人数",
      "付费价值",
      "D0 ROAS",
      "ARPPU",
      "付费率",
      "IR",
      "CTR",
      "CVR",
      "安装注册率",
      "CPM",
      "CPC",
      "IPM",
      "CPI",
      "CPR",
      "CPP",
      "D1留存率",
      "D7留存率",
      "单选",
    ]);

    expect(mapping.mappedFields).toMatchObject({
      date: "日期",
      platform: "媒体",
      country: "国家",
      spendUsd: "消耗",
      impressions: "展示次数",
      clicks: "点击次数",
      installs: "安装人数",
      activations: "注册人数",
      payers: "付费人数",
      revenueD7Usd: "付费价值",
      d0Roas: "D0 ROAS",
      arppu: "ARPPU",
      paymentRate: "付费率",
      installRate: "IR",
      ctr: "CTR",
      cvr: "CVR",
      installRegistrationRate: "安装注册率",
      cpm: "CPM",
      cpc: "CPC",
      ipm: "IPM",
      cpi: "CPI",
      cpr: "CPR",
      cpp: "CPP",
      d1RetentionRate: "D1留存率",
      d7RetentionRate: "D7留存率",
      selected: "单选",
    });
    expect(mapping.missingRequiredFields).toEqual([]);
  });

  it("normalizes supported platform aliases to the existing enum", () => {
    expect(normalizePlatform("facebook")).toBe("Meta Ads");
    expect(normalizePlatform("adwords")).toBe("Google Ads");
    expect(normalizePlatform("tt")).toBe("TikTok Ads");
    expect(normalizePlatform("bing ads")).toBe("Microsoft Ads");
    expect(normalizePlatform("linkedin")).toBe("LinkedIn Ads");
    expect(normalizePlatform("twitter")).toBe("X Ads");
    expect(normalizePlatform("unknown network")).toBeNull();
  });

  it("normalizes OS and creative type with warning-friendly fallbacks", () => {
    expect(normalizeOs("android")).toBe("Android");
    expect(normalizeOs("ios")).toBe("iOS");
    expect(normalizeOs("desktop")).toBeNull();
    expect(normalizeCreativeType("video")).toBe("Video");
    expect(normalizeCreativeType("playable ad")).toBe("Playable");
    expect(normalizeCreativeType("banner")).toBe("Image");
    expect(normalizeCreativeType("native")).toBeNull();
  });
});
