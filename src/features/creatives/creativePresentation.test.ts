import {
  buildCreativeTrendAriaLabel,
  buildCreativeTrendOptions,
} from "./creativePresentation";

const input = {
  creative: "Meta Creator Video",
  series: [
    { date: "2026-06-01", spendUsd: 12, cpi: 3, d7Roas: 0.5 },
    { date: "2026-06-02", spendUsd: 18, cpi: 2, d7Roas: 0.6 },
  ],
};

describe("creative presentation", () => {
  it("builds a nonblank accessible chart without gradients", () => {
    const option = buildCreativeTrendOptions(input);
    const serialized = JSON.stringify(option);

    expect(option.aria).toMatchObject({ enabled: true });
    expect(serialized).toContain("Spend");
    expect(serialized).toContain("CPI");
    expect(serialized).toContain("D7 ROAS");
    expect(serialized).toContain("2026-06-01");
    expect(serialized).not.toMatch(/linear|radial|colorStops/i);
    expect(buildCreativeTrendAriaLabel(input)).toContain(
      "Meta Creator Video 每日趋势",
    );
  });
});
