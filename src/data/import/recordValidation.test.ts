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

  it("imports IGS daily agency report rows without campaign columns", () => {
    const result = validateImportRows(
      [
        {
          日期: "04-01",
          媒体: "Meta",
          国家: "US",
          消耗: "616",
          展示次数: "7078",
          点击次数: "93",
          安装人数: "22",
          注册人数: "9",
          付费人数: "5",
          付费价值: "100",
          "D0 ROAS": "16.23%",
          ARPPU: "$20",
          付费率: "55.56%",
          IR: "0.31%",
          CTR: "1.31%",
          CVR: "23.66%",
          安装注册率: "40.91%",
          CPM: "$87",
          CPC: "$7",
          IPM: "3.1",
          CPI: "$28.0",
          CPR: "$68.4",
          CPP: "$123.2",
          D1留存率: "12.5%",
          D7留存率: "8.4%",
          单选: "keep",
        },
      ],
      {
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
      },
      {
        importedAt: "2026-06-10T02:00:00.000Z",
        sourceName: "IGS-Dara Casino 代投日报_2026-04.csv",
      },
    );

    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      date: "2026-04-01",
      platform: "Meta Ads",
      campaign: "Unspecified Campaign",
      country: "US",
      spendUsd: 616,
      impressions: 7078,
      clicks: 93,
      installs: 22,
      activations: 9,
      payers: 5,
      revenueD7Usd: 100,
      d0Roas: 0.1623,
      arppu: 20,
      paymentRate: 0.5556,
      installRate: 0.0031,
      ctr: 0.0131,
      cvr: 0.2366,
      installRegistrationRate: 0.4091,
      cpm: 87,
      cpc: 7,
      ipm: 3.1,
      cpi: 28,
      cpr: 68.4,
      cpp: 123.2,
      d1RetentionRate: 0.125,
      d7RetentionRate: 0.084,
      selected: "keep",
    });
    expect(result.quality).toMatchObject({
      totalRows: 1,
      validRows: 1,
      errorRows: 0,
    });
  });
});
