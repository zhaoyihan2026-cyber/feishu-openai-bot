import type { AcquisitionRecord, Metrics } from "./types";

export function safeDivide(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
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
  };
}
