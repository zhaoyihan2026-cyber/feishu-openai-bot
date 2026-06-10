import { ArrowRight, RotateCcw, Search } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Chart } from "../../components/charts/Chart";
import {
  DataTable,
  type DataTableColumn,
} from "../../components/data/DataTable";
import { ModuleState } from "../../components/feedback/ModuleState";
import { useAppData } from "../../components/layout/AppShell";
import { aggregateMetrics } from "../../domain/metrics";
import { useFilters } from "../../state/FilterContext";
import {
  advanceDrillPath,
  applyDrillPath,
  buildDailyDetailRows,
  buildDailySeries,
  deriveBaselinePath,
  dimensionLabels,
  drillDimensions,
  groupDimension,
  nextDimension,
  searchDimensionRows,
  truncateDrillPathToBaseline,
  type ContributionMetric,
  type DailyDetailRow,
  type DimensionRow,
  type DrillDimension,
  type DrillPathItem,
} from "./performanceAnalysis";
import {
  buildPerformanceChartAriaLabels,
  buildPerformanceChartOptions,
  performanceFormatters,
} from "./performancePresentation";

function ModuleHeading({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <header className="performance-module-heading">
      <h2>{title}</h2>
      {detail || action ? (
        <div className="performance-module-heading-actions">
          {detail ? <span>{detail}</span> : null}
          {action}
        </div>
      ) : null}
    </header>
  );
}

type DetailMode = "summary" | "daily";

export function PerformanceAnalysisPage() {
  const { filteredRecords } = useAppData();
  const { filters, resetFilters } = useFilters();
  const baselinePath = useMemo(
    () => deriveBaselinePath(filters),
    [
      filters.accounts,
      filters.countries,
      filters.operatingSystems,
      filters.platforms,
    ],
  );
  const baselineKey = useMemo(
    () =>
      baselinePath
        .map(({ dimension, value }) => `${dimension}:${value}`)
        .join("|"),
    [baselinePath],
  );
  const [drillPath, setDrillPath] =
    useState<DrillPathItem[]>(baselinePath);
  const [currentDimension, setCurrentDimension] =
    useState<DrillDimension>(() => nextDimension(baselinePath));
  const [contributionMetric, setContributionMetric] =
    useState<ContributionMetric>("spend");
  const [detailMode, setDetailMode] = useState<DetailMode>("summary");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setDrillPath(baselinePath);
    setCurrentDimension(nextDimension(baselinePath));
    setSearchQuery("");
  }, [baselineKey]);

  const currentRecords = useMemo(
    () => applyDrillPath(filteredRecords, drillPath),
    [drillPath, filteredRecords],
  );
  const metrics = useMemo(
    () => aggregateMetrics(currentRecords),
    [currentRecords],
  );
  const rows = useMemo(
    () =>
      groupDimension(
        currentRecords,
        currentDimension,
        contributionMetric,
      ),
    [contributionMetric, currentDimension, currentRecords],
  );
  const visibleRows = useMemo(
    () => searchDimensionRows(rows, searchQuery),
    [rows, searchQuery],
  );
  const dailyDetailRows = useMemo(
    () =>
      buildDailyDetailRows(
        currentRecords,
        currentDimension,
        contributionMetric,
      ),
    [contributionMetric, currentDimension, currentRecords],
  );
  const visibleDailyDetailRows = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    if (!normalizedQuery) {
      return dailyDetailRows;
    }

    return dailyDetailRows.filter((row) =>
      [
        row.date,
        row.value,
        row.platform,
        row.account,
        row.country,
        row.os,
        row.campaign,
        row.adGroup,
        row.creative,
      ].some((value) =>
        value.toLocaleLowerCase().includes(normalizedQuery),
      ),
    );
  }, [dailyDetailRows, searchQuery]);
  const dailySeries = useMemo(
    () => buildDailySeries(currentRecords),
    [currentRecords],
  );
  const chartInput = useMemo(
    () => ({
      metrics,
      dailySeries,
      rows,
      dimension: currentDimension,
      contributionMetric,
    }),
    [
      contributionMetric,
      currentDimension,
      dailySeries,
      metrics,
      rows,
    ],
  );
  const chartOptions = useMemo(
    () => buildPerformanceChartOptions(chartInput),
    [chartInput],
  );
  const chartAriaLabels = useMemo(
    () => buildPerformanceChartAriaLabels(chartInput),
    [chartInput],
  );
  const selectedDimensions = useMemo(
    () => new Set(drillPath.map(({ dimension }) => dimension)),
    [drillPath],
  );
  const availableDimensions = drillDimensions.filter(
    (dimension) => !selectedDimensions.has(dimension),
  );

  const resetDrill = useCallback(() => {
    setDrillPath(baselinePath);
    setCurrentDimension(nextDimension(baselinePath));
    setSearchQuery("");
    setDetailMode("summary");
  }, [baselinePath]);

  const drillInto = useCallback(
    (value: string) => {
      if (currentDimension === "creative") {
        return;
      }
      const nextPath = advanceDrillPath(
        drillPath,
        currentDimension,
        value,
      );
      setDrillPath(nextPath);
      setCurrentDimension(nextDimension(nextPath, currentDimension));
      setSearchQuery("");
      setDetailMode("summary");
    },
    [currentDimension, drillPath],
  );

  const truncateTo = useCallback(
    (targetDimension?: DrillDimension) => {
      const nextPath = truncateDrillPathToBaseline(
        drillPath,
        baselinePath,
        targetDimension,
      );
      setDrillPath(nextPath);
      setCurrentDimension(nextDimension(nextPath, targetDimension));
      setSearchQuery("");
      setDetailMode("summary");
    },
    [baselinePath, drillPath],
  );

  const columns = useMemo<DataTableColumn<DimensionRow>[]>(
    () => [
      {
        id: "value",
        header: dimensionLabels[currentDimension],
        cell: ({ value }) =>
          currentDimension === "creative" ? (
            <span className="performance-terminal-value">{value}</span>
          ) : (
            <button
              className="performance-table-link"
              type="button"
              onClick={() => drillInto(value)}
            >
              <span>{value}</span>
              <ArrowRight aria-hidden="true" />
            </button>
          ),
        sortable: true,
        sortValue: ({ value }) => value,
      },
      {
        id: "spend",
        header: "花费 Spend",
        cell: ({ spendUsd }) => performanceFormatters.currency(spendUsd),
        sortable: true,
        sortValue: ({ spendUsd }) => spendUsd,
        align: "right",
      },
      {
        id: "impressions",
        header: "展示 Impressions",
        cell: ({ impressions }) => performanceFormatters.integer(impressions),
        sortable: true,
        sortValue: ({ impressions }) => impressions,
        align: "right",
      },
      {
        id: "clicks",
        header: "点击 Clicks",
        cell: ({ clicks }) => performanceFormatters.integer(clicks),
        sortable: true,
        sortValue: ({ clicks }) => clicks,
        align: "right",
      },
      {
        id: "installs",
        header: "安装 Installs",
        cell: ({ installs }) => performanceFormatters.integer(installs),
        sortable: true,
        sortValue: ({ installs }) => installs,
        align: "right",
      },
      {
        id: "activations",
        header: "注册 Registrations",
        cell: ({ activations }) => performanceFormatters.integer(activations),
        sortable: true,
        sortValue: ({ activations }) => activations,
        align: "right",
      },
      {
        id: "paid-value",
        header: "付费价值 Paid Value",
        cell: ({ revenueD7Usd }) =>
          performanceFormatters.currency(revenueD7Usd),
        sortable: true,
        sortValue: ({ revenueD7Usd }) => revenueD7Usd,
        align: "right",
      },
      {
        id: "ctr",
        header: "CTR",
        cell: ({ ctr }) => performanceFormatters.percent(ctr),
        sortable: true,
        sortValue: ({ ctr }) => ctr,
        align: "right",
      },
      {
        id: "cvr",
        header: "CVR",
        cell: ({ cvr }) => performanceFormatters.percent(cvr),
        sortable: true,
        sortValue: ({ cvr }) => cvr,
        align: "right",
      },
      {
        id: "cpi",
        header: "CPI",
        cell: ({ cpi }) => performanceFormatters.currency(cpi),
        sortable: true,
        sortValue: ({ cpi }) => cpi,
        align: "right",
      },
      {
        id: "cpr",
        header: "CPR",
        cell: ({ cpr }) => performanceFormatters.currency(cpr),
        sortable: true,
        sortValue: ({ cpr }) => cpr,
        align: "right",
      },
      {
        id: "cpp",
        header: "CPP",
        cell: ({ cpp }) => performanceFormatters.currency(cpp),
        sortable: true,
        sortValue: ({ cpp }) => cpp,
        align: "right",
      },
      {
        id: "activation-rate",
        header: "激活率",
        cell: ({ activationRate }) =>
          performanceFormatters.percent(activationRate),
        sortable: true,
        sortValue: ({ activationRate }) => activationRate,
        align: "right",
      },
      {
        id: "payers",
        header: "付费用户",
        cell: ({ payers }) => performanceFormatters.integer(payers),
        sortable: true,
        sortValue: ({ payers }) => payers,
        align: "right",
      },
      {
        id: "d0-roas",
        header: "D0 ROAS",
        cell: ({ d0Roas }) => performanceFormatters.percent(d0Roas),
        sortable: true,
        sortValue: ({ d0Roas }) => d0Roas,
        align: "right",
      },
      {
        id: "d7-roas",
        header: "D7 ROAS",
        cell: ({ d7Roas }) => performanceFormatters.percent(d7Roas),
        sortable: true,
        sortValue: ({ d7Roas }) => d7Roas,
        align: "right",
      },
      {
        id: "d1-retention",
        header: "D1 留存",
        cell: ({ d1RetentionRate }) =>
          performanceFormatters.percent(d1RetentionRate),
        sortable: true,
        sortValue: ({ d1RetentionRate }) => d1RetentionRate,
        align: "right",
      },
      {
        id: "d7-retention",
        header: "D7 留存",
        cell: ({ d7RetentionRate }) =>
          performanceFormatters.percent(d7RetentionRate),
        sortable: true,
        sortValue: ({ d7RetentionRate }) => d7RetentionRate,
        align: "right",
      },
      {
        id: "contribution",
        header: "贡献占比",
        cell: ({ contribution }) =>
          performanceFormatters.percent(contribution),
        sortable: true,
        sortValue: ({ contribution }) => contribution,
        align: "right",
      },
    ],
    [currentDimension, drillInto],
  );

  const dailyDetailColumns = useMemo<DataTableColumn<DailyDetailRow>[]>(
    () => [
      {
        id: "date",
        header: "日期 Date",
        cell: ({ date }) => date,
        sortable: true,
        sortValue: ({ date }) => date,
      },
      {
        id: "value",
        header: dimensionLabels[currentDimension],
        cell: ({ value }) => (
          <span className="performance-terminal-value">{value}</span>
        ),
        sortable: true,
        sortValue: ({ value }) => value,
      },
      {
        id: "campaign",
        header: "Campaign",
        cell: ({ campaign }) => (
          <span className="performance-terminal-value">{campaign}</span>
        ),
        sortable: true,
        sortValue: ({ campaign }) => campaign,
      },
      {
        id: "ad-group",
        header: "Ad Group",
        cell: ({ adGroup }) => (
          <span className="performance-terminal-value">{adGroup}</span>
        ),
        sortable: true,
        sortValue: ({ adGroup }) => adGroup,
      },
      {
        id: "creative",
        header: "Creative",
        cell: ({ creative }) => (
          <span className="performance-terminal-value">{creative}</span>
        ),
        sortable: true,
        sortValue: ({ creative }) => creative,
      },
      {
        id: "spend",
        header: "花费 Spend",
        cell: ({ spendUsd }) => performanceFormatters.currency(spendUsd),
        sortable: true,
        sortValue: ({ spendUsd }) => spendUsd,
        align: "right",
      },
      {
        id: "impressions",
        header: "展示 Impressions",
        cell: ({ impressions }) => performanceFormatters.integer(impressions),
        sortable: true,
        sortValue: ({ impressions }) => impressions,
        align: "right",
      },
      {
        id: "clicks",
        header: "点击 Clicks",
        cell: ({ clicks }) => performanceFormatters.integer(clicks),
        sortable: true,
        sortValue: ({ clicks }) => clicks,
        align: "right",
      },
      {
        id: "installs",
        header: "安装 Installs",
        cell: ({ installs }) => performanceFormatters.integer(installs),
        sortable: true,
        sortValue: ({ installs }) => installs,
        align: "right",
      },
      {
        id: "activations",
        header: "注册 Registrations",
        cell: ({ activations }) => performanceFormatters.integer(activations),
        sortable: true,
        sortValue: ({ activations }) => activations,
        align: "right",
      },
      {
        id: "payers",
        header: "付费用户",
        cell: ({ payers }) => performanceFormatters.integer(payers),
        sortable: true,
        sortValue: ({ payers }) => payers,
        align: "right",
      },
      {
        id: "paid-value",
        header: "付费价值 Paid Value",
        cell: ({ revenueD7Usd }) =>
          performanceFormatters.currency(revenueD7Usd),
        sortable: true,
        sortValue: ({ revenueD7Usd }) => revenueD7Usd,
        align: "right",
      },
      {
        id: "ctr",
        header: "CTR",
        cell: ({ ctr }) => performanceFormatters.percent(ctr),
        sortable: true,
        sortValue: ({ ctr }) => ctr,
        align: "right",
      },
      {
        id: "cvr",
        header: "CVR",
        cell: ({ cvr }) => performanceFormatters.percent(cvr),
        sortable: true,
        sortValue: ({ cvr }) => cvr,
        align: "right",
      },
      {
        id: "cpi",
        header: "CPI",
        cell: ({ cpi }) => performanceFormatters.currency(cpi),
        sortable: true,
        sortValue: ({ cpi }) => cpi,
        align: "right",
      },
      {
        id: "cpr",
        header: "CPR",
        cell: ({ cpr }) => performanceFormatters.currency(cpr),
        sortable: true,
        sortValue: ({ cpr }) => cpr,
        align: "right",
      },
      {
        id: "cpp",
        header: "CPP",
        cell: ({ cpp }) => performanceFormatters.currency(cpp),
        sortable: true,
        sortValue: ({ cpp }) => cpp,
        align: "right",
      },
      {
        id: "d0-roas",
        header: "D0 ROAS",
        cell: ({ d0Roas }) => performanceFormatters.percent(d0Roas),
        sortable: true,
        sortValue: ({ d0Roas }) => d0Roas,
        align: "right",
      },
      {
        id: "d1-retention",
        header: "D1 留存",
        cell: ({ d1RetentionRate }) =>
          performanceFormatters.percent(d1RetentionRate),
        sortable: true,
        sortValue: ({ d1RetentionRate }) => d1RetentionRate,
        align: "right",
      },
      {
        id: "d7-retention",
        header: "D7 留存",
        cell: ({ d7RetentionRate }) =>
          performanceFormatters.percent(d7RetentionRate),
        sortable: true,
        sortValue: ({ d7RetentionRate }) => d7RetentionRate,
        align: "right",
      },
      {
        id: "contribution",
        header: "贡献占比",
        cell: ({ contribution }) =>
          performanceFormatters.percent(contribution),
        sortable: true,
        sortValue: ({ contribution }) => contribution,
        align: "right",
      },
    ],
    [currentDimension],
  );

  return (
    <section className="page performance-page">
      <header className="page-heading performance-heading">
        <div>
          <h1>投放分析</h1>
          <p>沿投放层级下钻，比较获客效率与贡献结构</p>
        </div>
        <button
          className="performance-reset"
          type="button"
          onClick={resetDrill}
        >
          <RotateCcw aria-hidden="true" />
          重置下钻
        </button>
      </header>

      <nav className="performance-breadcrumb" aria-label="投放分析路径">
        {drillPath.length > baselinePath.length ? (
          <button type="button" onClick={() => truncateTo()}>
            全部数据
          </button>
        ) : (
          <span aria-current="page">全部数据</span>
        )}
        {drillPath.map((item, index) => {
          const label = `${dimensionLabels[item.dimension]} / ${item.value}`;
          const isCurrent = index === drillPath.length - 1;
          return (
            <span className="performance-crumb" key={`${item.dimension}:${item.value}`}>
              <span aria-hidden="true">/</span>
              {isCurrent ? (
                <strong aria-current="page">{label}</strong>
              ) : (
                <button
                  type="button"
                  onClick={() => truncateTo(item.dimension)}
                >
                  {label}
                </button>
              )}
            </span>
          );
        })}
      </nav>

      {filteredRecords.length === 0 ? (
        <ModuleState
          variant="empty"
          title="当前筛选无投放数据"
          message="请调整全局筛选或恢复默认条件后继续分析。"
          action={
            <button type="button" onClick={resetFilters}>
              重置全局筛选
            </button>
          }
        />
      ) : currentRecords.length === 0 ? (
        <ModuleState
          variant="empty"
          title="当前下钻路径无数据"
          message="全局筛选已变化，返回筛选基线后重新选择。"
          action={
            <button type="button" onClick={resetDrill}>
              返回筛选基线
            </button>
          }
        />
      ) : (
        <>
          <section
            className="performance-dimension-bar"
            aria-labelledby="performance-dimension-heading"
          >
            <div>
              <span>当前维度</span>
              <strong
                className="performance-current-dimension"
                id="performance-dimension-heading"
              >
                {dimensionLabels[currentDimension]}
              </strong>
            </div>
            <div
              className="performance-segments"
              role="group"
              aria-label="选择分析维度"
            >
              {availableDimensions.map((dimension) => (
                <button
                  aria-pressed={dimension === currentDimension}
                  className={
                    dimension === currentDimension ? "is-active" : undefined
                  }
                  key={dimension}
                  type="button"
                  onClick={() => {
                    setCurrentDimension(dimension);
                    setSearchQuery("");
                  }}
                >
                  {dimensionLabels[dimension]}
                </button>
              ))}
            </div>
          </section>

          <div className="performance-chart-grid">
            <section className="performance-module">
              <ModuleHeading title="获客漏斗" detail="Impressions → Payers" />
              <Chart
                option={chartOptions.funnel}
                ariaLabel={chartAriaLabels.funnel}
              />
            </section>

            <section className="performance-module">
              <ModuleHeading title="每日趋势" detail="Spend · Installs · D7 ROAS" />
              <Chart
                option={chartOptions.daily}
                ariaLabel={chartAriaLabels.daily}
              />
            </section>

            <section className="performance-module performance-module--wide">
              <ModuleHeading
                title={`${dimensionLabels[currentDimension]} 贡献排行`}
                detail={`Top ${Math.min(rows.length, 8)}`}
                action={
                  <div
                    className="performance-contribution-toggle"
                    role="group"
                    aria-label="选择贡献指标"
                  >
                    <button
                      aria-pressed={contributionMetric === "spend"}
                      className={
                        contributionMetric === "spend"
                          ? "is-active"
                          : undefined
                      }
                      type="button"
                      onClick={() => setContributionMetric("spend")}
                    >
                      Spend
                    </button>
                    <button
                      aria-pressed={contributionMetric === "installs"}
                      className={
                        contributionMetric === "installs"
                          ? "is-active"
                          : undefined
                      }
                      type="button"
                      onClick={() => setContributionMetric("installs")}
                    >
                      Installs
                    </button>
                  </div>
                }
              />
              <Chart
                className="performance-ranking-chart"
                option={chartOptions.contribution}
                ariaLabel={chartAriaLabels.contribution}
              />
            </section>
          </div>

          <section className="performance-table-section">
            <header className="performance-table-heading">
              <div>
                <h2>下钻明细</h2>
                <span>
                  {detailMode === "summary"
                    ? `${visibleRows.length} 项`
                    : `${visibleDailyDetailRows.length} 条每日记录`}
                </span>
              </div>
              <div
                className="performance-detail-toggle"
                role="group"
                aria-label="选择下钻明细视图"
              >
                <button
                  aria-pressed={detailMode === "summary"}
                  className={detailMode === "summary" ? "is-active" : undefined}
                  type="button"
                  onClick={() => setDetailMode("summary")}
                >
                  汇总视图
                </button>
                <button
                  aria-pressed={detailMode === "daily"}
                  className={detailMode === "daily" ? "is-active" : undefined}
                  type="button"
                  onClick={() => setDetailMode("daily")}
                >
                  每日明细
                </button>
              </div>
              <label className="performance-search">
                <span className="visually-hidden">搜索当前维度</span>
                <Search aria-hidden="true" />
                <input
                  aria-label="搜索当前维度"
                  type="search"
                  value={searchQuery}
                  placeholder={
                    detailMode === "summary"
                      ? `搜索 ${dimensionLabels[currentDimension]}`
                      : "搜索日期 / Campaign / Creative"
                  }
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </label>
            </header>
            {detailMode === "summary" && visibleRows.length > 0 ? (
              <DataTable
                ariaLabel="投放分析明细表"
                className="performance-table"
                columns={columns}
                rows={visibleRows}
                getRowKey={({ value }) => value}
              />
            ) : detailMode === "daily" &&
              visibleDailyDetailRows.length > 0 ? (
              <DataTable
                ariaLabel="投放分析每日明细表"
                className="performance-table performance-table--daily-detail"
                columns={dailyDetailColumns}
                rows={visibleDailyDetailRows}
                getRowKey={({ id }) => id}
              />
            ) : (
              <ModuleState
                className="performance-no-results"
                variant="empty"
                title="没有匹配结果"
                message="请修改搜索词以查看当前维度数据。"
                action={
                  <button type="button" onClick={() => setSearchQuery("")}>
                    清除搜索
                  </button>
                }
              />
            )}
          </section>
        </>
      )}
    </section>
  );
}
