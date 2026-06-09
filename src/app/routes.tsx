import { Route, Routes } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { CompositeDataProvider } from "../data/import/CompositeDataProvider";
import { browserImportedDatasetRepository } from "../data/import/browserRepository";
import { ImportedDataProvider } from "../data/import/ImportedDataProvider";
import { MockDataProvider } from "../data/mock/MockDataProvider";
import { CreativeAnalysisPage } from "../features/creatives/CreativeAnalysisPage";
import { DataManagementPage } from "../features/data-management/DataManagementPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { PerformanceAnalysisPage } from "../features/performance/PerformanceAnalysisPage";
import { useAppData } from "../components/layout/AppShell";

const defaultDataProvider = new CompositeDataProvider(
  new ImportedDataProvider(browserImportedDatasetRepository),
  new MockDataProvider(),
);

function DataManagementRoute() {
  const { refreshData } = useAppData();

  return (
    <DataManagementPage
      onDataChanged={refreshData}
      repository={browserImportedDatasetRepository}
    />
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell dataProvider={defaultDataProvider} />}>
        <Route index element={<DashboardPage />} />
        <Route path="performance" element={<PerformanceAnalysisPage />} />
        <Route path="creatives" element={<CreativeAnalysisPage />} />
        <Route path="data" element={<DataManagementRoute />} />
      </Route>
    </Routes>
  );
}
