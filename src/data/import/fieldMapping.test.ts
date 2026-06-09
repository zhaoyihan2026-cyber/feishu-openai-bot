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
