import { ArrowRight, CircleAlert, Gauge, TriangleAlert } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Chart } from "../../components/charts/Chart";
import {
  DataTable,
  type DataTableColumn,
} from "../../components/data/DataTable";
import { ModuleState } from "../../components/feedback/ModuleState";
import { useAppData } from "../../components/layout/AppShell";
import { KpiStrip } from "../../components/metrics/KpiStrip";
import type { Platform } from "../../domain/types";
import { useFilters } from "../../state/FilterContext";
import {
  buildDashboardChartAriaLabels,
  buildDashboardChartOptions,
  buildDashboardKpis,
  dashboardFormatters,
  formatAnomalyValues,
} from "./dashboardPresentation";
import {
  buildDashboardViewModel,
  type PlatformSummary,
} from "./dashboardViewModel";

function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai",
  }).format(new Date(timestamp));
}

function ModuleHeading({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <header className="dashboard-module-heading">
      <h2>{title}</h2>
      {detail ? <span>{detail}</span> : null}
    </header>
  );
}

function progressPercent(value: number): number {
  const normalizedValue = Number.isFinite(value) ? value : 0;
  return Math.round(Math.min(1, Math.max(0, normalizedValue)) * 100);
}

export function BudgetPace({
  budgetPace,
  timePace,
}: {
  budgetPace: number;
  timePace: number;
}) {
  const paceGap = budgetPace - timePace;
  const budgetProgress = progressPercent(budgetPace);
  const timeProgress = progressPercent(timePace);
  const status =
    paceGap >= 0.1 ? "超前" : paceGap <= -0.1 ? "滞后" : "正常";

  return (
    <div className="budget-pace">
      <div className="budget-pace-summary">
        <Gauge aria-hidden="true" />
        <strong>{dashboardFormatters.percent(budgetPace)}</strong>
        <span className={`budget-status budget-status--${status}`}>
          {status}
        </span>
      </div>
      <div className="budget-track-list">
        <div className="budget-track-row">
          <span>预算消耗</span>
          <div
            className="budget-track"
            role="progressbar"
            aria-label="预算消耗进度"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={budgetProgress}
          >
            <span style={{ width: `${budgetProgress}%` }} />
          </div>
          <strong>{dashboardFormatters.percent(budgetPace)}</strong>
        </div>
        <div className="budget-track-row">
          <span>时间进度</span>
          <div
            className="budget-track budget-track--time"
            role="progressbar"
            aria-label="时间进度"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={timeProgress}
          >
            <span style={{ width: `${timeProgress}%` }} />
          </div>
          <strong>{dashboardFormatters.percent(timePace)}</strong>
        </div>
      </div>
      <p>
        预算进度较时间进度
        <strong>
          {paceGap >= 0 ? " 快 " : " 慢 "}
          {dashboardFormatters.percent(Math.abs(paceGap))}
        </strong>
      </p>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { filters, resetFilters, setFilter } = useFilters();
  const { filteredRecords, mockAsOfTimestamp } = useAppData();
  const viewModel = useMemo(
    () =>
      buildDashboardViewModel(filteredRecords, {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        mockAsOfTimestamp,
      }),
    [filteredRecords, filters.dateFrom, filters.dateTo, mockAsOfTimestamp],
  );
  const kpis = useMemo(
    () => buildDashboardKpis(viewModel.currentMetrics, viewModel.comparisons),
    [viewModel.comparisons, viewModel.currentMetrics],
  );
  const chartInput = useMemo(
    () => ({
      dailySeries: viewModel.dailySeries,
      platforms: viewModel.platforms,
      countries: viewModel.countries,
    }),
    [viewModel.countries, viewModel.dailySeries, viewModel.platforms],
  );
  const chartOptions = useMemo(
    () => buildDashboardChartOptions(chartInput),
    [chartInput],
  );
  const chartAriaLabels = useMemo(
    () => buildDashboardChartAriaLabels(chartInput),
    [chartInput],
  );

  const openPerformance = useCallback(
    (platform: Platform) => {
      setFilter("platforms", [platform]);
      navigate("/performance");
    },
    [navigate, setFilter],
  );

  const platformColumns = useMemo<DataTableColumn<PlatformSummary>[]>(
    () => [
      {
        id: "platform",
        header: "平台 Platform",
        cell: ({ platform }) => (
          <button
            className="dashboard-table-link"
            type="button"
            onClick={() => openPerformance(platform)}
          >
            {platform}
            <ArrowRight aria-hidden="true" />
          </button>
        ),
        sortable: true,
        sortValue: ({ platform }) => platform,
      },
      {
        id: "spend",
        header: "花费 Spend",
        cell: ({ spendUsd }) => dashboardFormatters.currency(spendUsd),
        sortable: true,
        sortValue: ({ spendUsd }) => spendUsd,
        align: "right",
      },
      {
        id: "installs",
        header: "安装 Installs",
        cell: ({ installs }) => dashboardFormatters.integer(installs),
        sortable: true,
        sortValue: ({ installs }) => installs,
        align: "right",
      },
      {
        id: "cpi",
        header: "CPI",
        cell: ({ cpi }) => dashboardFormatters.currency(cpi),
        sortable: true,
        sortValue: ({ cpi }) => cpi,
        align: "right",
      },
      {
        id: "activation-rate",
        header: "激活率",
        cell: ({ activationRate }) =>
          dashboardFormatters.percent(activationRate),
        sortable: true,
        sortValue: ({ activationRate }) => activationRate,
        align: "right",
      },
      {
        id: "payers",
        header: "付费用户",
        cell: ({ payers }) => dashboardFormatters.integer(payers),
        sortable: true,
        sortValue: ({ payers }) => payers,
        align: "right",
      },
      {
        id: "d7-roas",
        header: "D7 ROAS",
        cell: ({ d7Roas }) => dashboardFormatters.percent(d7Roas),
        sortable: true,
        sortValue: ({ d7Roas }) => d7Roas,
        align: "right",
      },
    ],
    [openPerformance],
  );

  return (
    <section className="page dashboard-page">
      <header className="page-heading dashboard-heading">
        <div>
          <h1>管理总览</h1>
          <p>海外 App 获客核心指标、预算节奏与风险概览</p>
        </div>
        <div className="dashboard-heading-meta">
          <time dateTime={mockAsOfTimestamp}>
            更新于 {formatTimestamp(mockAsOfTimestamp)}
          </time>
          <span className="currency-badge">USD</span>
        </div>
      </header>

      {filteredRecords.length === 0 ? (
        <ModuleState
          className="dashboard-empty"
          variant="empty"
          title="当前筛选无数据"
          message="请调整日期或维度筛选，或恢复默认条件以查看管理总览。"
          action={
            <button type="button" onClick={resetFilters}>
              重置筛选
            </button>
          }
        />
      ) : (
        <>
          <KpiStrip
            className="dashboard-kpis"
            items={kpis}
            ariaLabel="管理总览关键指标"
          />

          <div className="dashboard-grid">
            <section className="dashboard-module">
              <ModuleHeading
                title="花费与安装趋势"
                detail="每日花费与安装量"
              />
              <Chart
                option={chartOptions.spendAndInstalls}
                ariaLabel={chartAriaLabels.spendAndInstalls}
              />
            </section>

            <section className="dashboard-module">
              <ModuleHeading title="预算节奏" detail="预算与时间进度" />
              <BudgetPace
                budgetPace={viewModel.budgetPace}
                timePace={viewModel.timePace}
              />
            </section>

            <section className="dashboard-module">
              <ModuleHeading title="D7 ROAS 趋势" detail="每日回收效率" />
              <Chart
                option={chartOptions.d7Roas}
                ariaLabel={chartAriaLabels.d7Roas}
              />
            </section>

            <section className="dashboard-module">
              <ModuleHeading title="平台构成" detail="按花费占比" />
              <Chart
                option={chartOptions.platformMix}
                ariaLabel={chartAriaLabels.platformMix}
              />
            </section>

            <section className="dashboard-module">
              <ModuleHeading title="国家表现排行" detail="按花费排序" />
              <ol className="country-ranking">
                {viewModel.countries.slice(0, 6).map((country, index) => (
                  <li key={country.country}>
                    <span className="country-rank">{index + 1}</span>
                    <strong>{country.country}</strong>
                    <span>{dashboardFormatters.integer(country.installs)} 安装</span>
                    <b>{dashboardFormatters.currency(country.spendUsd)}</b>
                  </li>
                ))}
              </ol>
            </section>

            <section className="dashboard-module">
              <ModuleHeading title="地域分布" detail="国家花费规模" />
              <Chart
                option={chartOptions.countryMap}
                ariaLabel={chartAriaLabels.countryMap}
              />
            </section>

            <section className="dashboard-module dashboard-module--anomalies">
              <ModuleHeading
                title="异常提醒"
                detail={`${viewModel.anomalies.length} 项`}
              />
              {viewModel.anomalies.length > 0 ? (
                <ul className="anomaly-list">
                  {viewModel.anomalies.map((anomaly) => {
                    const values = formatAnomalyValues(anomaly);
                    const severityLabel =
                      anomaly.severity === "high" ? "高风险" : "中风险";

                    return (
                      <li key={anomaly.id}>
                        {anomaly.severity === "high" ? (
                          <TriangleAlert aria-hidden="true" />
                        ) : (
                          <CircleAlert aria-hidden="true" />
                        )}
                        <div className="anomaly-content">
                          <div className="anomaly-title">
                            <strong>{anomaly.scope}</strong>
                            <span
                              className={`anomaly-severity anomaly-severity--${anomaly.severity}`}
                            >
                              {severityLabel}
                            </span>
                          </div>
                          <p>{anomaly.message}</p>
                          <dl className="anomaly-values">
                            <div>
                              <dt>{values.currentLabel}</dt>
                              <dd>{values.currentValue}</dd>
                            </div>
                            <div>
                              <dt>{values.comparisonLabel}</dt>
                              <dd>{values.comparisonValue}</dd>
                            </div>
                          </dl>
                        </div>
                        <button
                          type="button"
                          onClick={() => openPerformance(anomaly.scope)}
                          aria-label={`查看 ${anomaly.scope} 投放表现`}
                          title={`查看 ${anomaly.scope} 投放表现`}
                        >
                          <ArrowRight aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <ModuleState
                  variant="empty"
                  title="当前无异常"
                  message="所选范围内未触发投放风险阈值。"
                />
              )}
            </section>

            <section className="dashboard-module dashboard-module--full">
              <ModuleHeading title="平台表现" detail="点击平台进入投放分析" />
              <DataTable
                ariaLabel="平台表现数据表"
                className="dashboard-platform-table"
                columns={platformColumns}
                rows={viewModel.platforms}
                getRowKey={({ platform }) => platform}
              />
            </section>
          </div>
        </>
      )}
    </section>
  );
}
