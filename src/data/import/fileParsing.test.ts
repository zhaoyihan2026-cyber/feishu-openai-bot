import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseImportFile } from "./fileParsing";

describe("parseImportFile", () => {
  it("parses CSV files into raw rows", async () => {
    const file = new File(
      ["Date,Platform,Spend\n2026-06-09,Meta,10\n"],
      "sample.csv",
      { type: "text/csv" },
    );

    const result = await parseImportFile(file);

    expect(result).toEqual({
      rows: [{ Date: "2026-06-09", Platform: "Meta", Spend: "10" }],
      headers: ["Date", "Platform", "Spend"],
    });
  });

  it("parses the first worksheet in xlsx files into raw rows", async () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["Date", "Platform", "Spend"],
      ["2026-06-09", "Meta", 10],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Import");
    const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const file = new File([bytes], "sample.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const result = await parseImportFile(file);

    expect(result.headers).toEqual(["Date", "Platform", "Spend"]);
    expect(result.rows).toEqual([
      { Date: "2026-06-09", Platform: "Meta", Spend: 10 },
    ]);
  });

  it("rejects unsupported files", async () => {
    const file = new File(["{}"], "sample.json", { type: "application/json" });

    await expect(parseImportFile(file)).rejects.toThrow(
      "仅支持 CSV 和 .xlsx 文件",
    );
  });
});
