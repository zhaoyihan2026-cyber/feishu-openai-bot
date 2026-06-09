import type {
  ImportedDatasetRepository,
  ImportedDatasetState,
  ImportedDatasetVersion,
} from "./types";

const DATABASE_NAME = "app-acquisition-bi";
const DATABASE_VERSION = 1;
const STORE_NAME = "dataset-state";
const STATE_KEY = "singleton";

interface StoredState {
  key: typeof STATE_KEY;
  state: ImportedDatasetState;
}

const emptyState: ImportedDatasetState = {
  currentVersionId: null,
  versions: [],
};

function requestToPromise<Result>(
  request: IDBRequest<Result>,
): Promise<Result> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => {
      reject(request.error ?? new Error("IndexedDB 操作失败"));
    });
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve());
    transaction.addEventListener("abort", () => {
      reject(transaction.error ?? new Error("IndexedDB 事务已中止"));
    });
    transaction.addEventListener("error", () => {
      reject(transaction.error ?? new Error("IndexedDB 事务失败"));
    });
  });
}

export class IndexedDbImportedDatasetRepository
  implements ImportedDatasetRepository
{
  private databasePromise: Promise<IDBDatabase> | null = null;

  async loadState(): Promise<ImportedDatasetState> {
    return structuredClone(await this.readState());
  }

  async saveVersion(version: ImportedDatasetVersion): Promise<void> {
    const state = await this.readState();
    await this.writeState({
      currentVersionId: version.id,
      versions: [
        ...state.versions.filter(({ id }) => id !== version.id),
        structuredClone(version),
      ],
    });
  }

  async setCurrentVersion(versionId: string | null): Promise<void> {
    const state = await this.readState();
    await this.writeState({ ...state, currentVersionId: versionId });
  }

  async deleteVersion(versionId: string): Promise<void> {
    const state = await this.readState();
    await this.writeState({
      currentVersionId:
        state.currentVersionId === versionId ? null : state.currentVersionId,
      versions: state.versions.filter(({ id }) => id !== versionId),
    });
  }

  async clear(): Promise<void> {
    await this.writeState(emptyState);
  }

  private getDatabase(): Promise<IDBDatabase> {
    if (!this.databasePromise) {
      this.databasePromise = new Promise((resolve, reject) => {
        if (!("indexedDB" in globalThis)) {
          reject(new Error("当前浏览器不支持 IndexedDB"));
          return;
        }

        const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
        request.addEventListener("upgradeneeded", () => {
          const database = request.result;
          if (!database.objectStoreNames.contains(STORE_NAME)) {
            database.createObjectStore(STORE_NAME, { keyPath: "key" });
          }
        });
        request.addEventListener("success", () => resolve(request.result));
        request.addEventListener("error", () => {
          reject(request.error ?? new Error("IndexedDB 打开失败"));
        });
      });
    }

    return this.databasePromise;
  }

  private async readState(): Promise<ImportedDatasetState> {
    const database = await this.getDatabase();
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const stored = await requestToPromise<StoredState | undefined>(
      store.get(STATE_KEY),
    );
    await transactionDone(transaction);
    return stored?.state ? structuredClone(stored.state) : emptyState;
  }

  private async writeState(state: ImportedDatasetState): Promise<void> {
    const database = await this.getDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.put({ key: STATE_KEY, state: structuredClone(state) });
    await transactionDone(transaction);
  }
}
