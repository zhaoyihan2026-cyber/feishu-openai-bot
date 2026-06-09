import { BarChart3, Image, LayoutDashboard } from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { NavLink, Outlet, useOutletContext } from "react-router-dom";
import type { DataProvider } from "../../data/DataProvider";
import { MockDataProvider } from "../../data/mock/MockDataProvider";
import { MOCK_DATA_AS_OF } from "../../data/mock/records";
import { filterRecords } from "../../domain/filters";
import type { AcquisitionRecord } from "../../domain/types";
import { useFilters } from "../../state/FilterContext";
import { GlobalFilters } from "../filters/GlobalFilters";
import { ModuleState } from "../feedback/ModuleState";

const defaultDataProvider = new MockDataProvider();

export interface AppDataContext {
  records: AcquisitionRecord[];
  filteredRecords: AcquisitionRecord[];
  loading: boolean;
  error: Error | null;
  mockAsOfTimestamp: string;
}

interface NavigationItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

interface AppShellProps {
  dataProvider?: DataProvider;
}

const navigationItems: NavigationItem[] = [
  { to: "/", label: "总览", icon: LayoutDashboard, end: true },
  { to: "/performance", label: "投放分析", icon: BarChart3 },
  { to: "/creatives", label: "素材分析", icon: Image },
];

function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai",
  }).format(new Date(timestamp));
}

function navClassName({ isActive }: { isActive: boolean }): string {
  return isActive ? "app-nav-link is-active" : "app-nav-link";
}

export function AppShell({
  dataProvider = defaultDataProvider,
}: AppShellProps = {}) {
  const { filters } = useFilters();
  const [records, setRecords] = useState<AcquisitionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    setLoading(true);
    setError(null);

    dataProvider
      .getRecords()
      .then((nextRecords) => {
        if (isCurrent) {
          setRecords(nextRecords);
        }
      })
      .catch((reason: unknown) => {
        if (isCurrent) {
          setError(
            reason instanceof Error ? reason : new Error("Unknown data error"),
          );
        }
      })
      .finally(() => {
        if (isCurrent) {
          setLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [dataProvider, loadAttempt]);

  const filteredRecords = useMemo(
    () => filterRecords(records, filters),
    [filters, records],
  );
  const outletContext = useMemo<AppDataContext>(
    () => ({
      records,
      filteredRecords,
      loading,
      error,
      mockAsOfTimestamp: MOCK_DATA_AS_OF,
    }),
    [error, filteredRecords, loading, records],
  );
  const shouldRenderOutlet = !loading && !error;

  let state: ReactNode = null;
  if (loading) {
    state = (
      <ModuleState
        variant="loading"
        title="正在加载投放数据"
        message="正在读取模拟数据集。"
      />
    );
  } else if (error) {
    state = (
      <ModuleState
        variant="error"
        title="投放数据加载失败"
        message={error.message}
        action={
          <button type="button" onClick={() => setLoadAttempt((value) => value + 1)}>
            重试
          </button>
        }
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-product">
          <span>ACQUISITION BI</span>
          <strong>海外 App 投放 BI</strong>
        </div>
        <nav className="app-nav" aria-label="主要导航">
          {navigationItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              className={navClassName}
              end={end}
              key={to}
              to={to}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="app-workspace">
        <header className="app-header">
          <div className="app-header-meta">
            <span>投放数据工作台</span>
            <time dateTime={MOCK_DATA_AS_OF}>
              数据截至 {formatTimestamp(MOCK_DATA_AS_OF)}
            </time>
          </div>
          <div className="app-filters">
            <GlobalFilters records={records} />
          </div>
        </header>

        <main className="app-main">
          {state}
          {shouldRenderOutlet ? <Outlet context={outletContext} /> : null}
        </main>
      </div>
    </div>
  );
}

export function useAppData(): AppDataContext {
  return useOutletContext<AppDataContext>();
}
