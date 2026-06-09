import { Route, Routes } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { CreativeAnalysisPage } from "../features/creatives/CreativeAnalysisPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { PerformanceAnalysisPage } from "../features/performance/PerformanceAnalysisPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="performance" element={<PerformanceAnalysisPage />} />
        <Route path="creatives" element={<CreativeAnalysisPage />} />
      </Route>
    </Routes>
  );
}
