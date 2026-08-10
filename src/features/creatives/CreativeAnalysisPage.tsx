import { LineChart, RotateCcw, Search } from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import { Chart } from "../../components/charts/Chart";
import { ModuleState } from "../../components/feedback/ModuleState";
import { useAppData } from "../../components/layout/AppShell";
import { useFilters } from "../../state/FilterContext";
import {
  buildCreativeDiagnostics,
  buildCreativeDailySeries,
  createDefaultCreativeFilters,
  filterAndSortCreatives,
  groupCreatives,
  resolveSelectedCreative,
  type CreativeFilters,
  type CreativeSort,
  type CreativeStatus,
  type CreativeSummary,
} from "./creativeAnalysis";
import {
  buildCreativeTrendAriaLabel,
  buildCreativeTrendOptions,
  creativeFormatters,
} from "./creativePresentation";

function uniqueSorted<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort((left, right) =>
    left.localeCompare(right, "en"),
  );
}

const missingThumbnailSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240">
    <rect width="320" height="240" fill="#f4f3ee"/>
    <path d="M48 166l58-66 47 48 28-31 91 92H48z" fill="#d7ded9"/>
    <circle cx="232" cy="70" r="24" fill="#c6d4cd"/>
    <text x="160" y="126" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#686b66">Creative</text>
  </svg>`,
)}`;

function CreativeDiagnosticsStrip({
  diagnostics,
}: {
  diagnostics: ReturnType<typeof buildCreativeDiagnostics>;
}) {
  return (
    <section className="creative-diagnostics" aria-label="素材诊断摘要">
      <article className="creative-diagnostic-card">
        <span>素材总数</span>
        <strong>{diagnostics.totalCreatives}</strong>
        <p>当前全局筛选范围</p>
      </article>
      <article className="creative-diagnostic-card">
        <span>图片覆盖率</span>
        <strong>{creativeFormatters.percent(diagnostics.thumbnailCoverage)}</strong>
        <p>缺图会用占位图展示</p>
      </article>
      <article className="creative-diagnostic-card">
        <span>质量分布</span>
        <strong>
          优 {diagnostics.statusCounts.优秀} / 观{" "}
          {diagnostics.statusCounts.观察} / 差{" "}
          {diagnostics.statusCounts.较差}
        </strong>
        <p>按 D7 ROAS 与 CPI 自动判断</p>
      </article>
      <article className="creative-diagnostic-card creative-diagnostic-card--wide">
        <span>最佳素材</span>
        <strong>{diagnostics.bestCreative?.creative ?? "-"}</strong>
        <p>
          D7 ROAS{" "}
          {creativeFormatters.percent(diagnostics.bestCreative?.d7Roas ?? 0)}
        </p>
      </article>
      <article className="creative-diagnostic-card creative-diagnostic-card--wide">
        <span>优先处理</span>
        <strong>{diagnostics.priorityCreative?.creative ?? "-"}</strong>
        <p>
          Spend{" "}
          {creativeFormatters.currency(
            diagnostics.priorityCreative?.spendUsd ?? 0,
          )}{" "}
          · D7 ROAS{" "}
          {creativeFormatters.percent(
            diagnostics.priorityCreative?.d7Roas ?? 0,
          )}
        </p>
      </article>
    </section>
  );
}

function CreativeRow({
  row,
  selected,
  onSelect,
}: {
  row: CreativeSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  const thumbnail = row.thumbnail.trim() || missingThumbnailSvg;

  return (
    <article
      className={`creative-row${selected ? " is-selected" : ""}`}
      aria-current={selected ? "true" : undefined}
    >
      <img
        alt={`${row.creative} 素材缩略图`}
        className="creative-thumbnail"
        src={thumbnail}
        width="160"
        height="120"
        onError={(event) => {
          event.currentTarget.src = missingThumbnailSvg;
        }}
      />
      <div className="creative-row-content">
        <header className="creative-row-heading">
          <div>
            <h3>{row.creative}</h3>
            <p>
              {row.platform} · {row.campaign} · {row.adGroup}
            </p>
          </div>
          <button
            className="creative-select"
            type="button"
            aria-label={`选择 ${row.creative}`}
            title={`查看 ${row.creative} 趋势`}
            aria-pressed={selected}
            onClick={onSelect}
          >
            <LineChart aria-hidden="true" />
          </button>
        </header>
        <div className="creative-labels">
          <span className="creative-type">{row.type}</span>
          <span className={`creative-status creative-status--${row.status}`}>
            {row.status}
          </span>
        </div>
        <dl className="creative-metrics">
          <div>
            <dt>Spend</dt>
            <dd>{creativeFormatters.currency(row.spendUsd)}</dd>
          </div>
          <div>
            <dt>CTR</dt>
            <dd>{creativeFormatters.percent(row.ctr)}</dd>
          </div>
          <div>
            <dt>CPI</dt>
            <dd>{creativeFormatters.currency(row.cpi)}</dd>
          </div>
          <div>
            <dt>Activation Rate</dt>
            <dd>{creativeFormatters.percent(row.activationRate)}</dd>
          </div>
          <div>
            <dt>D7 ROAS</dt>
            <dd>{creativeFormatters.percent(row.d7Roas)}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

export function CreativeAnalysisPage() {
  const { filteredRecords } = useAppData();
  const { resetFilters } = useFilters();
  const [localFilters, setLocalFilters] = useState<CreativeFilters>(
    createDefaultCreativeFilters,
  );
  const [selectedCreative, setSelectedCreative] = useState<string | null>(null);
  const rows = useMemo(
    () => groupCreatives(filteredRecords),
    [filteredRecords],
  );
  const diagnostics = useMemo(
    () => buildCreativeDiagnostics(rows),
    [rows],
  );
  const visibleRows = useMemo(
    () => filterAndSortCreatives(rows, localFilters),
    [localFilters, rows],
  );
  const resolvedSelection = resolveSelectedCreative(
    visibleRows,
    selectedCreative,
  );

  useEffect(() => {
    if (resolvedSelection !== selectedCreative) {
      setSelectedCreative(resolvedSelection);
    }
  }, [resolvedSelection, selectedCreative]);

  const platforms = useMemo(
    () => uniqueSorted(rows.map(({ platform }) => platform)),
    [rows],
  );
  const selectedRow =
    visibleRows.find(({ creative }) => creative === resolvedSelection) ?? null;
  const dailySeries = useMemo(
    () => buildCreativeDailySeries(filteredRecords, resolvedSelection),
    [filteredRecords, resolvedSelection],
  );
  const chartInput = useMemo(
    () => ({
      creative: selectedRow?.creative ?? "",
      series: dailySeries,
    }),
    [dailySeries, selectedRow?.creative],
  );
  const chartOptions = useMemo(
    () => buildCreativeTrendOptions(chartInput),
    [chartInput],
  );
  const chartAriaLabel = useMemo(
    () => buildCreativeTrendAriaLabel(chartInput),
    [chartInput],
  );

  const setFilter =
    <Key extends keyof CreativeFilters>(key: Key) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setLocalFilters((current) => ({
        ...current,
        [key]: event.target.value,
      }));
    };

  const resetLocalFilters = () => {
    setLocalFilters(createDefaultCreativeFilters());
  };

  return (
    <section className="page creative-page">
      <header className="page-heading creative-heading">
        <div>
          <h1>素材分析</h1>
          <p>比较素材效率、质量状态与每日投放回报</p>
        </div>
        <strong>{rows.length} 个素材</strong>
      </header>

      {filteredRecords.length === 0 ? (
        <ModuleState
          variant="empty"
          title="当前筛选无素材数据"
          message="请调整全局筛选或恢复默认条件后继续分析。"
          action={
            <button type="button" onClick={resetFilters}>
              重置全局筛选
            </button>
          }
        />
      ) : (
        <>
          <CreativeDiagnosticsStrip diagnostics={diagnostics} />

          <section className="creative-controls" aria-label="素材本地筛选">
            <label>
              <span>素材平台</span>
              <select
                aria-label="素材平台"
                value={localFilters.platform}
                onChange={setFilter("platform")}
              >
                <option value="">全部平台</option>
                {platforms.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>素材类型</span>
              <select
                aria-label="素材类型"
                value={localFilters.type}
                onChange={setFilter("type")}
              >
                <option value="">全部类型</option>
                {(["Video", "Image", "Playable"] as const).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>素材状态</span>
              <select
                aria-label="素材状态"
                value={localFilters.status}
                onChange={(event) =>
                  setLocalFilters((current) => ({
                    ...current,
                    status: event.target.value as CreativeStatus | "",
                  }))
                }
              >
                <option value="">全部状态</option>
                <option value="优秀">优秀</option>
                <option value="观察">观察</option>
                <option value="较差">较差</option>
              </select>
            </label>
            <label>
              <span>素材排序</span>
              <select
                aria-label="素材排序"
                value={localFilters.sort}
                onChange={(event) =>
                  setLocalFilters((current) => ({
                    ...current,
                    sort: event.target.value as CreativeSort,
                  }))
                }
              >
                <option value="spend-desc">Spend 降序</option>
                <option value="ctr-desc">CTR 降序</option>
                <option value="cpi-asc">CPI 升序</option>
                <option value="activation-rate-desc">
                  Activation Rate 降序
                </option>
                <option value="d7-roas-desc">D7 ROAS 降序</option>
              </select>
            </label>
            <label className="creative-search">
              <span>搜索素材</span>
              <span className="creative-search-field">
                <Search aria-hidden="true" />
                <input
                  aria-label="搜索素材"
                  type="search"
                  value={localFilters.search}
                  placeholder="名称、Campaign、Ad Group"
                  onChange={setFilter("search")}
                />
              </span>
            </label>
            <button
              className="creative-reset"
              type="button"
              aria-label="重置素材筛选"
              title="重置素材筛选"
              onClick={resetLocalFilters}
            >
              <RotateCcw aria-hidden="true" />
            </button>
          </section>

          {visibleRows.length === 0 ? (
            <ModuleState
              variant="empty"
              title="没有匹配的素材"
              message="请修改本地筛选条件或搜索词。"
              action={
                <button type="button" onClick={resetLocalFilters}>
                  重置素材筛选
                </button>
              }
            />
          ) : (
            <div className="creative-workbench">
              <section
                className="creative-list-panel"
                aria-label="素材表现列表"
              >
                <header className="creative-panel-heading">
                  <h2>素材表现</h2>
                  <span>{visibleRows.length} 项</span>
                </header>
                <div className="creative-list">
                  {visibleRows.map((row) => (
                    <CreativeRow
                      key={row.creative}
                      row={row}
                      selected={row.creative === resolvedSelection}
                      onSelect={() => setSelectedCreative(row.creative)}
                    />
                  ))}
                </div>
              </section>

              {selectedRow ? (
                <aside className="creative-trend-panel">
                  <header className="creative-panel-heading creative-trend-heading">
                    <div>
                      <span>已选素材</span>
                      <h2>{selectedRow.creative} 趋势</h2>
                    </div>
                    <span>Spend · CPI · D7 ROAS</span>
                  </header>
                  <Chart
                    className="creative-trend-chart"
                    option={chartOptions}
                    ariaLabel={chartAriaLabel}
                  />
                  <dl className="creative-detail-grid" aria-label="已选素材信息">
                    <div>
                      <dt>Platform</dt>
                      <dd>{selectedRow.platform}</dd>
                    </div>
                    <div>
                      <dt>Campaign</dt>
                      <dd>{selectedRow.campaign}</dd>
                    </div>
                    <div>
                      <dt>Ad Group</dt>
                      <dd>{selectedRow.adGroup}</dd>
                    </div>
                    <div>
                      <dt>Type</dt>
                      <dd>{selectedRow.type}</dd>
                    </div>
                    <div>
                      <dt>Spend</dt>
                      <dd>{creativeFormatters.currency(selectedRow.spendUsd)}</dd>
                    </div>
                    <div>
                      <dt>D7 ROAS</dt>
                      <dd>{creativeFormatters.percent(selectedRow.d7Roas)}</dd>
                    </div>
                  </dl>
                </aside>
              ) : null}
            </div>
          )}
        </>
      )}
    </section>
  );
}
