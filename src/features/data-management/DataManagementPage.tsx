import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { DataTable, type DataTableColumn } from "../../components/data/DataTable";
import { ModuleState } from "../../components/feedback/ModuleState";
import { buildDatasetSummary } from "../../data/import/datasetSummary";
import { mapHeaders } from "../../data/import/fieldMapping";
import { parseImportFile } from "../../data/import/fileParsing";
import { validateImportRows } from "../../data/import/recordValidation";
import type {
  DatasetSummary,
  HeaderMappingResult,
  ImportedDatasetRepository,
  ImportedDatasetState,
  ImportedDatasetVersion,
  ImportMode,
  ImportQualitySummary,
  RawImportRow,
} from "../../data/import/types";
import type { AcquisitionRecord } from "../../domain/types";
import { useFilters } from "../../state/FilterContext";

interface DataManagementPageProps {
  repository: ImportedDatasetRepository;
  onDataChanged?: () => void;
}

interface ImportPreview {
  fileName: string;
  headers: string[];
  rows: RawImportRow[];
  mapping: HeaderMappingResult;
  records: AcquisitionRecord[];
  quality: ImportQualitySummary;
  issues: ImportedDatasetVersion["issues"];
  importedAt: string;
}

const recordPreviewColumns: DataTableColumn<AcquisitionRecord>[] = [
  { id: "date", header: "Date", cell: ({ date }) => date },
  { id: "platform", header: "Platform", cell: ({ platform }) => platform },
  { id: "campaign", header: "Campaign", cell: ({ campaign }) => campaign },
  { id: "spend", header: "Spend", cell: ({ spendUsd }) => `$${spendUsd}` },
  {
    id: "installs",
    header: "Installs",
    cell: ({ installs }) => installs.toLocaleString("en-US"),
  },
];

function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai",
  }).format(new Date(timestamp));
}

function createVersionId(fileName: string, importedAt: string): string {
  return `import:${encodeURIComponent(fileName)}:${Date.parse(importedAt)}`;
}

function createVersionName(fileName: string, importedAt: string): string {
  return `${fileName} ${formatTimestamp(importedAt)}`;
}

function currentVersion(state: ImportedDatasetState): ImportedDatasetVersion | null {
  return (
    state.versions.find(({ id }) => id === state.currentVersionId) ?? null
  );
}

function versionColumns(
  state: ImportedDatasetState,
  setCurrent: (versionId: string) => void,
  deleteVersion: (versionId: string) => void,
): DataTableColumn<ImportedDatasetVersion>[] {
  return [
    {
      id: "name",
      header: "版本",
      cell: ({ name, id }) => (
        <div>
          <strong>{name}</strong>
          {state.currentVersionId === id ? <span> 当前</span> : null}
        </div>
      ),
    },
    {
      id: "createdAt",
      header: "创建时间",
      cell: ({ createdAt }) => formatTimestamp(createdAt),
    },
    {
      id: "mode",
      header: "方式",
      cell: ({ mode }) => (mode === "append" ? "追加" : "覆盖"),
    },
    {
      id: "records",
      header: "记录数",
      cell: ({ summary }) => summary.recordCount.toLocaleString("en-US"),
    },
    {
      id: "range",
      header: "日期范围",
      cell: ({ summary }) =>
        summary.dateRange
          ? `${summary.dateRange.start} - ${summary.dateRange.end}`
          : "无",
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ id }) => (
        <div className="version-actions">
          <button
            disabled={state.currentVersionId === id}
            onClick={() => setCurrent(id)}
            type="button"
          >
            设为当前版本
          </button>
          <button
            disabled={state.currentVersionId === id}
            onClick={() => deleteVersion(id)}
            type="button"
          >
            删除版本
          </button>
        </div>
      ),
    },
  ];
}

export function DataManagementPage({
  repository,
  onDataChanged,
}: DataManagementPageProps) {
  const { setFilters } = useFilters();
  const [state, setState] = useState<ImportedDatasetState>({
    currentVersionId: null,
    versions: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  async function refresh() {
    setState(await repository.loadState());
  }

  useEffect(() => {
    let mounted = true;
    repository
      .loadState()
      .then((nextState) => {
        if (mounted) {
          setState(nextState);
          setError(null);
        }
      })
      .catch((reason: unknown) => {
        if (mounted) {
          setError(reason instanceof Error ? reason.message : "数据管理不可用");
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [repository]);

  const activeVersion = currentVersion(state);
  const columns = useMemo(
    () =>
      versionColumns(
        state,
        async (versionId) => {
          await repository.setCurrentVersion(versionId);
          await refresh();
          onDataChanged?.();
        },
        async (versionId) => {
          await repository.deleteVersion(versionId);
          await refresh();
          onDataChanged?.();
        },
      ),
    [onDataChanged, repository, state],
  );

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    try {
      const importedAt = new Date().toISOString();
      const parsed = await parseImportFile(file);
      const mapping = mapHeaders(parsed.headers);
      const validation = validateImportRows(parsed.rows, mapping.mappedFields, {
        importedAt,
        sourceName: file.name,
      });

      setPreview({
        fileName: file.name,
        headers: parsed.headers,
        rows: parsed.rows,
        mapping,
        records: validation.records,
        quality: validation.quality,
        issues: validation.issues,
        importedAt,
      });
    } catch (reason: unknown) {
      setPreview(null);
      setError(reason instanceof Error ? reason.message : "文件解析失败");
    } finally {
      event.target.value = "";
    }
  }

  async function saveImport(mode: ImportMode) {
    if (!preview || preview.records.length === 0) {
      return;
    }

    const baseRecords =
      mode === "append" && activeVersion ? activeVersion.records : [];
    const records = [...baseRecords, ...preview.records];
    const summary = buildDatasetSummary(
      records,
      preview.issues,
      preview.rows.length,
    );
    const version: ImportedDatasetVersion = {
      id: createVersionId(preview.fileName, preview.importedAt),
      name: createVersionName(preview.fileName, preview.importedAt),
      createdAt: preview.importedAt,
      mode,
      records,
      summary,
      issues: preview.issues,
    };

    await repository.saveVersion(version);
    await refresh();
    setPreview(null);
    applyImportedDataFilters(summary);
    onDataChanged?.();
  }

  function applyImportedDataFilters(summary: DatasetSummary) {
    if (!summary.dateRange) {
      return;
    }

    setFilters({
      dateFrom: summary.dateRange.start,
      dateTo: summary.dateRange.end,
      apps: [],
      platforms: [],
      accounts: [],
      countries: [],
      operatingSystems: [],
    });
  }

  async function clearImportedData() {
    await repository.clear();
    await refresh();
    setPreview(null);
    onDataChanged?.();
  }

  if (loading) {
    return (
      <ModuleState
        variant="loading"
        title="正在加载数据管理"
        message="正在读取本地导入版本。"
      />
    );
  }

  return (
    <section className="data-management-page">
      <header className="data-management-header">
        <div>
          <span>DATA MANAGEMENT</span>
          <h1>数据管理</h1>
        </div>
      </header>

      {error ? (
        <ModuleState variant="error" title="数据管理操作失败" message={error} />
      ) : null}

      <section className="data-source-status" aria-label="当前数据状态">
        <div>
          <span>当前数据源</span>
          <strong>
            {activeVersion ? "当前使用导入数据" : "当前使用模拟数据"}
          </strong>
        </div>
        <dl>
          <div>
            <dt>当前版本</dt>
            <dd>{activeVersion?.name ?? "MockDataProvider"}</dd>
          </div>
          <div>
            <dt>记录数</dt>
            <dd>
              {(activeVersion?.summary.recordCount ?? 0).toLocaleString("en-US")}
            </dd>
          </div>
          <div>
            <dt>日期范围</dt>
            <dd>
              {activeVersion?.summary.dateRange
                ? `${activeVersion.summary.dateRange.start} - ${activeVersion.summary.dateRange.end}`
                : "使用模拟数据范围"}
            </dd>
          </div>
          <div>
            <dt>平台数</dt>
            <dd>{activeVersion?.summary.platforms.length ?? 0}</dd>
          </div>
        </dl>
        <button
          disabled={state.versions.length === 0}
          onClick={clearImportedData}
          type="button"
        >
          清空本地导入数据
        </button>
      </section>

      <section className="import-panel">
        <header className="dashboard-module-heading">
          <div>
            <h2>导入向导</h2>
            <span>支持 CSV 和 Excel .xlsx</span>
          </div>
        </header>
        <label className="import-dropzone">
          <span>选择文件</span>
          <input
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            aria-label="导入文件"
            onChange={handleFileChange}
            type="file"
          />
        </label>

        {preview ? (
          <div className="import-preview">
            <section aria-label="字段识别">
              <h3>字段识别</h3>
              <ul>
                {Object.entries(preview.mapping.mappedFields).map(
                  ([field, header]) => (
                    <li key={field}>
                      {field} &lt;- {header}
                    </li>
                  ),
                )}
              </ul>
              {preview.mapping.missingRequiredFields.length > 0 ? (
                <p>
                  缺少必填字段：
                  {preview.mapping.missingRequiredFields.join(", ")}
                </p>
              ) : null}
            </section>

            <div className="import-summary-grid">
              <div>总行数 {preview.quality.totalRows}</div>
              <div>有效行 {preview.quality.validRows}</div>
              <div>错误行 {preview.quality.errorRows}</div>
              <div>警告 {preview.quality.warnings}</div>
            </div>

            <div className="import-save-panel">
              <div>
                <strong>预览已生成，保存后才会用于总览和投放分析。</strong>
                <span>
                  保存成功后，顶部日期会自动切换到导入数据范围。
                </span>
              </div>
              <div className="import-actions">
                <button
                  disabled={preview.records.length === 0}
                  onClick={() => saveImport("replace")}
                  type="button"
                >
                  保存并使用导入数据
                </button>
                <button
                  disabled={preview.records.length === 0}
                  onClick={() => saveImport("append")}
                  type="button"
                >
                  追加到当前数据
                </button>
              </div>
            </div>

            {preview.issues.length > 0 ? (
              <section className="issue-list">
                <h3>错误与警告</h3>
                <ul>
                  {preview.issues.slice(0, 10).map((issue, index) => (
                    <li key={`${issue.rowNumber}-${issue.field ?? "row"}-${index}`}>
                      第 {issue.rowNumber} 行：{issue.message}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <DataTable
              caption="导入预览"
              columns={recordPreviewColumns}
              emptyMessage="没有有效行"
              getRowKey={({ id }) => id}
              rows={preview.records.slice(0, 20)}
            />
          </div>
        ) : null}
      </section>

      <section className="version-list">
        <header className="dashboard-module-heading">
          <div>
            <h2>版本列表</h2>
            <span>回滚和切换本地数据版本</span>
          </div>
        </header>
        <DataTable
          caption="导入版本"
          columns={columns}
          emptyMessage="暂无导入版本"
          getRowKey={({ id }) => id}
          rows={state.versions}
        />
      </section>
    </section>
  );
}
