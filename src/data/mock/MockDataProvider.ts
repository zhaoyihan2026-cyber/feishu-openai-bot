import type { DataProvider } from "../DataProvider";
import { mockRecords } from "./records";

export class MockDataProvider implements DataProvider {
  async getRecords() {
    return structuredClone(mockRecords);
  }
}
