import { BrowserRouter } from "react-router-dom";
import { FilterProvider } from "../state/FilterContext";
import { AppRoutes } from "./routes";
import "./styles.css";

export function App() {
  return (
    <FilterProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </FilterProvider>
  );
}
