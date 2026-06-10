import type { AcquisitionRecord, Metrics } from "./types";

export function safeDivide(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function weightedAverage(
  records: AcquisitionRecord[],
  field: "d1RetentionRate" | "d7RetentionRate",
): number {
  const totals = records.reduce(
    (result, record) => {
      const value = record[field];
      if (value === undefined || !Number.isFinite(value)) {
        return result;
      }

      return {
        weightedValue: result.weightedValue + value * record.installs,
        weight: result.weight + record.installs,
      };
    },
    { weightedValue: 0, weight: 0 },
  );

  return safeDivide(totals.weightedValue, totals.weight);
}

export function aggregateMetrics(records: AcquisitionRecord[]): Metrics {
  const totals = records.reduce(
    (metrics, record) => {
      metrics.impressions += record.impressions;
      metrics.clicks += record.clicks;
      metrics.installs += record.installs;
      metrics.activations += record.activations;
      metrics.payers += record.payers;
      metrics.spendUsd += record.spendUsd;
      metrics.revenueD7Usd += record.revenueD7Usd;
      metrics.revenueD30Usd += record.revenueD30Usd;
      return metrics;
    },
    {
      impressions: 0,
      clicks: 0,
      installs: 0,
      activations: 0,
      payers: 0,
      spendUsd: 0,
      revenueD7Usd: 0,
      revenueD30Usd: 0,
    },
  );

  return {
    ...totals,
    ctr: safeDivide(totals.clicks, totals.impressions),
    cpi: safeDivide(totals.spendUsd, totals.installs),
    activationRate: safeDivide(totals.activations, totals.installs),
    payerRate: safeDivide(totals.payers, totals.installs),
    d7Roas: safeDivide(totals.revenueD7Usd, totals.spendUsd),
    d30Ltv: safeDivide(totals.revenueD30Usd, totals.payers),
    d0Roas: safeDivide(totals.revenueD7Usd, totals.spendUsd),
    arppu: safeDivide(totals.revenueD7Usd, totals.payers),
    paymentRate: safeDivide(totals.payers, totals.installs),
    installRate: safeDivide(totals.installs, totals.impressions),
    cvr: safeDivide(totals.installs, totals.clicks),
    installRegistrationRate: safeDivide(totals.activations, totals.installs),
    cpm: safeDivide(totals.spendUsd, totals.impressions) * 1_000,
    cpc: safeDivide(totals.spendUsd, totals.clicks),
    ipm: safeDivide(totals.installs, totals.impressions) * 1_000,
    cpr: safeDivide(totals.spendUsd, totals.activations),
    cpp: safeDivide(totals.spendUsd, totals.payers),
    d1RetentionRate: weightedAverage(records, "d1RetentionRate"),
    d7RetentionRate: weightedAverage(records, "d7RetentionRate"),
  };
}
