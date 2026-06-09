import { describe, expect, it } from "vitest";
import { validateImportRows } from "./recordValidation";

describe("validateImportRows", () => {
  it("converts valid mapped rows into acquisition records", () => {
    const result = validateImportRows(
      [
        {
          Date: "2026-06-09",
          Platform: "facebook",
          Campaign: "Launch",
          Spend: "$120.50",
          Impressions: "1,000",
          Clicks: "50",
          Installs: "20",
        },
      ],
      {
        date: "Date",
        platform: "Platform",
        campaign: "Campaign",
        spendUsd: "Spend",
        impressions: "Impressions",
        clicks: "Clicks",
        installs: "Installs",
      },
      { importedAt: "2026-06-09T10:00:00.000Z" },
    );

    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      date: "2026-06-09",
      updatedAt: "2026-06-09T10:00:00.000Z",
      platform: "Meta Ads",
      campaign: "Launch",
      spendUsd: 120.5,
      impressions: 1000,
      clicks: 50,
      installs: 20,
      app: "Unknown App",
      budgetUsd: 120.5,
    });
    expect(result.quality).toMatchObject({
      totalRows: 1,
      validRows: 1,
      errorRows: 0,
    });
  });

  it("rejects rows with missing required fields or unknown platforms", () => {
    const result = validateImportRows(
      [
        { Date: "2026-06-09", Platform: "unknown", Campaign: "Bad" },
        { Date: "2026-06-09", Platform: "meta", Campaign: "Missing spend" },
      ],
      {
        date: "Date",
        platform: "Platform",
        campaign: "Campaign",
        spendUsd: "Spend",
        impressions: "Impressions",
        clicks: "Clicks",
        installs: "Installs",
      },
      { importedAt: "2026-06-09T10:00:00.000Z" },
    );

    expect(result.records).toEqual([]);
    expect(result.quality.errorRows).toBe(2);
    expect(result.issues.map(({ severity }) => severity)).toContain("error");
  });

  it("adds warnings for fallback OS and creative type values", () => {
    const result = validateImportRows(
      [
        {
          Date: "2026-06-09",
          Platform: "meta",
          Campaign: "Launch",
          Spend: "10",
          Impressions: "100",
          Clicks: "10",
          Installs: "3",
          OS: "desktop",
          Type: "native",
        },
      ],
      {
        date: "Date",
        platform: "Platform",
        campaign: "Campaign",
        spendUsd: "Spend",
        impressions: "Impressions",
        clicks: "Clicks",
        installs: "Installs",
        os: "OS",
        creativeType: "Type",
      },
      { importedAt: "2026-06-09T10:00:00.000Z" },
    );

    expect(result.records[0]).toMatchObject({
      os: "iOS",
      creativeType: "Image",
    });
    expect(result.issues.filter(({ severity }) => severity === "warning"))
      .toHaveLength(2);
  });
});
