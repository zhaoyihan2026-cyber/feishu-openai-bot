import type { Key, ReactNode } from "react";

export type KpiStatus = "positive" | "negative" | "warning" | "neutral";

export interface KpiItem {
  id: Key;
  label: ReactNode;
  value: ReactNode;
  comparison?: ReactNode;
  status?: KpiStatus;
}

const statusLabels: Record<KpiStatus, string> = {
  positive: "状态：正向",
  negative: "状态：负向",
  warning: "状态：预警",
  neutral: "状态：中性",
};

interface KpiStripProps {
  items: readonly KpiItem[];
  ariaLabel?: string;
  className?: string;
}

export function KpiStrip({
  items,
  ariaLabel = "关键指标",
  className,
}: KpiStripProps) {
  const classes = ["kpi-strip", className].filter(Boolean).join(" ");

  return (
    <ul className={classes} aria-label={ariaLabel}>
      {items.map((item) => {
        const status = item.status ?? "neutral";
        const hasComparison =
          item.comparison !== null &&
          item.comparison !== undefined &&
          item.comparison !== "";

        return (
          <li
            className={`kpi-strip-item kpi-strip-item--${status}`}
            data-status={status}
            key={item.id}
          >
            <span className="kpi-strip-label">{item.label}</span>
            <span className="visually-hidden">{statusLabels[status]}</span>
            <strong className="kpi-strip-value">{item.value}</strong>
            {hasComparison ? (
              <span className="kpi-strip-comparison">{item.comparison}</span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
