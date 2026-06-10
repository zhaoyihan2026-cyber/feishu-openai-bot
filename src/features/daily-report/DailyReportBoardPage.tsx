import { CalendarDays, Expand, MoreHorizontal, RefreshCw } from "lucide-react";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { ModuleState } from "../../components/feedback/ModuleState";
import { useAppData, type AppDataContext } from "../../components/layout/AppShell";
import { useFilters } from "../../state/FilterContext";
import {
  buildDailyReportViewModel,
  type DailyReportCountryRow,
  type DailyReportMetricRow,
  type DailyReportPivotRow,
  type DailyReportViewModel,
} from "./dailyReportAnalysis";

interface DailyReportBoardPageProps {
  appData?: AppDataContext;
}

const currency = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});
const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat("zh-CN", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatMetric(
  value: number,
  format: "currency" | "integer" | "number" | "percent",
): string {
  if (!Number.isFinite(value)) {
    return "-";
  }

  switch (format) {
    case "currency":
      return currency.format(value);
    case "integer":
      return integer.format(value);
    case "percent":
      return percent.format(value);
    case "number":
      return number.format(value);
  }
}

function BoardModule({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="daily-report-module" aria-label={title}>
      <header className="daily-report-module-header">
        <div>
          <h2>{title}</h2>
          <span>按天　|　过去7天　VS</span>
        </div>
        <div className="daily-report-module-tools" aria-hidden="true">
          <RefreshCw />
          <Expand />
          <MoreHorizontal />
        </div>
      </header>
      {children}
    </section>
  );
}

function DateControl({ dates }: { dates: readonly string[] }) {
  return (
    <div className="daily-report-date-control">
      <span>日期</span>
      <button type="button" aria-label="前一天">
        ‹
      </button>
      <strong>{dates[0] ?? "-"}</strong>
      <button type="button" aria-label="后一天">
        ›
      </button>
    </div>
  );
}

function CountryTable({ rows }: { rows: DailyReportCountryRow[] }) {
  return (
    <div className="daily-report-table-scroll">
      <table className="daily-report-table daily-report-country-table">
        <thead>
          <tr>
            <th scope="col">国家</th>
            <th scope="col">消耗</th>
            <th scope="col">安装人数</th>
            <th scope="col">注册人数</th>
            <th scope="col">付费人数</th>
            <th scope="col">CPI</th>
            <th scope="col">CPR</th>
            <th scope="col">CPP</th>
            <th scope="col">CPM</th>
            <th scope="col">IPM</th>
            <th scope="col">CTR</th>
            <th scope="col">CVR</th>
            <th scope="col">D0 ROAS</th>
            <th scope="col">D1留存率</th>
            <th scope="col">D7留存率</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.country}>
              <th scope="row">{row.country}</th>
              <td>{formatMetric(row.spendUsd, "currency")}</td>
              <td>{formatMetric(row.installs, "integer")}</td>
              <td>{formatMetric(row.activations, "integer")}</td>
              <td>{formatMetric(row.payers, "integer")}</td>
              <td>{formatMetric(row.cpi, "currency")}</td>
              <td>{formatMetric(row.cpr, "currency")}</td>
              <td>{formatMetric(row.cpp, "currency")}</td>
              <td>{formatMetric(row.cpm, "currency")}</td>
              <td>{formatMetric(row.ipm, "number")}</td>
              <td>{formatMetric(row.ctr, "percent")}</td>
              <td>{formatMetric(row.cvr, "percent")}</td>
              <td>{formatMetric(row.d0Roas, "percent")}</td>
              <td>{formatMetric(row.d1RetentionRate, "percent")}</td>
              <td>{formatMetric(row.d7RetentionRate, "percent")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PivotMetricRows({
  dates,
  row,
}: {
  dates: readonly string[];
  row: DailyReportPivotRow;
}) {
  return (
    <>
      {row.metrics.map((metric, index) => (
        <tr key={`${row.label}:${metric.id}`}>
          {index === 0 ? (
            <th className="daily-report-group-cell" rowSpan={row.metrics.length}>
              {row.label}
            </th>
          ) : null}
          <th scope="row">{metric.label}</th>
          <td>{formatMetric(metric.total, metric.format)}</td>
          {dates.map((date) => (
            <td key={date}>
              {formatMetric(metric.valuesByDate[date] ?? 0, metric.format)}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function PivotTable({
  dates,
  firstColumn,
  rows,
}: {
  dates: readonly string[];
  firstColumn: string;
  rows: DailyReportPivotRow[];
}) {
  return (
    <div className="daily-report-table-scroll">
      <table className="daily-report-table daily-report-pivot-table">
        <thead>
          <tr>
            <th scope="col">{firstColumn}</th>
            <th scope="col">指标</th>
            <th scope="col">阶段汇总</th>
            {dates.map((date) => (
              <th scope="col" key={date}>
                {date}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <PivotMetricRows dates={dates} key={row.label} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DailyReportBoard({ viewModel }: { viewModel: DailyReportViewModel }) {
  const countryTitle = `${viewModel.channelName} - 新用户行为 - 分国家`;
  const campaignTitle = `${viewModel.channelName} - 新用户行为 - 分 Campaign`;
  const creativeTitle = `${viewModel.channelName} - 新用户行为 - 分 Campaign 分 Creative`;

  return (
    <section className="daily-report-page">
      <header className="daily-report-page-header">
        <div>
          <span>日报看板</span>
          <h1>{viewModel.title}</h1>
        </div>
        <div className="daily-report-page-tools" aria-hidden="true">
          <span>UTC+8</span>
          <CalendarDays />
          <RefreshCw />
          <MoreHorizontal />
        </div>
      </header>

      <BoardModule title={countryTitle}>
        <DateControl dates={viewModel.dates} />
        <CountryTable rows={viewModel.countryRows} />
      </BoardModule>

      <BoardModule title={campaignTitle}>
        <PivotTable
          dates={viewModel.dates}
          firstColumn="Campaign"
          rows={viewModel.campaignRows}
        />
      </BoardModule>

      <BoardModule title={creativeTitle}>
        <DateControl dates={viewModel.dates} />
        <PivotTable
          dates={viewModel.dates}
          firstColumn="Campaign / Creative"
          rows={viewModel.creativeRows}
        />
      </BoardModule>
    </section>
  );
}

export function DailyReportBoardPage({ appData }: DailyReportBoardPageProps) {
  const outletData = useAppData();
  const data = appData ?? outletData;
  const { filters, resetFilters } = useFilters();
  const viewModel = useMemo(
    () =>
      buildDailyReportViewModel(data.filteredRecords, {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      }),
    [data.filteredRecords, filters.dateFrom, filters.dateTo],
  );

  if (data.filteredRecords.length === 0) {
    return (
      <ModuleState
        variant="empty"
        title="当前筛选无日报数据"
        message="请导入数据，或调整日期和筛选条件。"
        action={
          <button type="button" onClick={resetFilters}>
            重置全局筛选
          </button>
        }
      />
    );
  }

  return <DailyReportBoard viewModel={viewModel} />;
}
