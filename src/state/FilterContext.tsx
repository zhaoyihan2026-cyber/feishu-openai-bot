import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_FILTERS,
  createDefaultFilters,
  type FilterState,
} from "../domain/filters";

export { DEFAULT_FILTERS };

interface FilterContextValue {
  filters: FilterState;
  setFilter: <Key extends keyof FilterState>(
    key: Key,
    value: FilterState[Key],
  ) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
}

interface FilterProviderProps {
  children: ReactNode;
}

const FilterContext = createContext<FilterContextValue | undefined>(undefined);

export function FilterProvider({ children }: FilterProviderProps) {
  const [filters, setFilters] = useState<FilterState>(createDefaultFilters);

  const setFilter = useCallback(
    <Key extends keyof FilterState>(key: Key, value: FilterState[Key]) => {
      setFilters((current) => ({
        ...current,
        [key]: value,
      }));
    },
    [],
  );

  const setFilterValues = useCallback((values: Partial<FilterState>) => {
    setFilters((current) => ({
      ...current,
      ...values,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(createDefaultFilters());
  }, []);

  const value = useMemo(
    () => ({ filters, setFilter, setFilters: setFilterValues, resetFilters }),
    [filters, resetFilters, setFilter, setFilterValues],
  );

  return (
    <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
  );
}

export function useFilters(): FilterContextValue {
  const context = useContext(FilterContext);

  if (context === undefined) {
    throw new Error("useFilters must be used within a FilterProvider");
  }

  return context;
}
