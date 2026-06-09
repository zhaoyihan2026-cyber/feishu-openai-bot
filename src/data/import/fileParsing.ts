import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { RawImportRow } from "./types";

export interface ParsedImportFile {
  headers: string[];
  rows: RawImportRow[];
}

function isCsv(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith(".csv") ||
    file.type === "text/csv" ||
    file.type === "application/csv"
  );
}

function isXlsx(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith(".xlsx") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

function headersFromRows(rows: RawImportRow[]): string[] {
  return rows[0] ? Object.keys(rows[0]) : [];
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => {
      reject(reader.error ?? new Error("文件读取失败"));
    });
    reader.readAsText(file);
  });
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error("文件读取失败"));
      }
    });
    reader.addEventListener("error", () => {
      reject(reader.error ?? new Error("文件读取失败"));
    });
    reader.readAsArrayBuffer(file);
  });
}

async function parseCsv(file: File): Promise<ParsedImportFile> {
  const text = await readFileAsText(file);
  const result = Papa.parse<RawImportRow>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (result.errors.length > 0) {
    throw new Error(result.errors[0].message);
  }

  return {
    headers: result.meta.fields ?? headersFromRows(result.data),
    rows: result.data,
  };
}

async function parseXlsx(file: File): Promise<ParsedImportFile> {
  const workbook = XLSX.read(await readFileAsArrayBuffer(file), {
    type: "array",
    cellDates: false,
  });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { headers: [], rows: [] };
  }

  const rows = XLSX.utils.sheet_to_json<RawImportRow>(
    workbook.Sheets[sheetName],
    { defval: "" },
  );

  return {
    headers: headersFromRows(rows),
    rows,
  };
}

export async function parseImportFile(file: File): Promise<ParsedImportFile> {
  if (isCsv(file)) {
    return parseCsv(file);
  }

  if (isXlsx(file)) {
    return parseXlsx(file);
  }

  throw new Error("仅支持 CSV 和 .xlsx 文件");
}
