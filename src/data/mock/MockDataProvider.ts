import type { DataProvider } from "../DataProvider";
import { MOCK_DATA_AS_OF, mockRecords } from "./records";

export class MockDataProvider implements DataProvider {
  async getRecords() {
    return structuredClone(mockRecords);
  }

  async getMetadata() {
    return {
      type: "mock" as const,
      label: "MockDataProvider",
      recordCount: mockRecords.length,
      timestamp: MOCK_DATA_AS_OF,
    };
  }
}
