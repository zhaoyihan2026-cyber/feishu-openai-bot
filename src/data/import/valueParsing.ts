export interface ParseSuccess<Value> {
  ok: true;
  value: Value;
}

export interface ParseFailure {
  ok: false;
  message: string;
}

export type ParseResult<Value> = ParseSuccess<Value> | ParseFailure;

const DATE_PATTERN = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/;
const MONTH_DAY_PATTERN = /^(\d{1,2})[-/](\d{1,2})$/;
const EXCEL_EPOCH_OFFSET_DAYS = 25_569;
const MS_PER_DAY = 24 * 60 * 60 * 1_000;

function success<Value>(value: Value): ParseSuccess<Value> {
  return { ok: true, value };
}

function failure(message: string): ParseFailure {
  return { ok: false, message };
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isExactUtcDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseDateValue(
  value: unknown,
  options: { defaultYear?: number } = {},
): ParseResult<string> {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return success(toIsoDate(value));
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const timestamp = Math.round(value - EXCEL_EPOCH_OFFSET_DAYS) * MS_PER_DAY;
    return success(toIsoDate(new Date(timestamp)));
  }

  const raw = String(value ?? "").trim();
  const match = DATE_PATTERN.exec(raw);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!isExactUtcDate(year, month, day)) {
      return failure("日期不存在");
    }

    return success(toIsoDate(new Date(Date.UTC(year, month - 1, day))));
  }

  const monthDayMatch = MONTH_DAY_PATTERN.exec(raw);
  if (!monthDayMatch || !options.defaultYear) {
    return failure("日期格式无效");
  }

  const year = options.defaultYear;
  const month = Number(monthDayMatch[1]);
  const day = Number(monthDayMatch[2]);
  if (!isExactUtcDate(year, month, day)) {
    return failure("日期不存在");
  }

  return success(toIsoDate(new Date(Date.UTC(year, month - 1, day))));
}

export function parseNumberValue(
  value: unknown,
  options: {
    required: boolean;
    defaultValue?: number;
    allowNegative?: boolean;
  },
): ParseResult<number> {
  const raw =
    typeof value === "number" ? String(value) : String(value ?? "").trim();

  if (!raw) {
    if (options.required) {
      return failure("数字字段不能为空");
    }

    return success(options.defaultValue ?? 0);
  }

  const parsed = Number(raw.replace(/[$,\s]/g, ""));
  if (!Number.isFinite(parsed)) {
    return failure("数字格式无效");
  }

  if (options.allowNegative === false && parsed < 0) {
    return failure("数字不能为负数");
  }

  return success(parsed);
}

export function parsePercentValue(
  value: unknown,
  options: {
    required: boolean;
    defaultValue?: number;
    allowNegative?: boolean;
  },
): ParseResult<number> {
  const raw =
    typeof value === "number" ? String(value) : String(value ?? "").trim();

  if (!raw) {
    if (options.required) {
      return failure("百分比字段不能为空");
    }

    return success(options.defaultValue ?? 0);
  }

  const hasPercentSign = raw.includes("%");
  const parsed = Number(raw.replace(/[%,$,\s]/g, ""));
  if (!Number.isFinite(parsed)) {
    return failure("百分比格式无效");
  }

  const valueAsRate = hasPercentSign
    ? Number((parsed / 100).toFixed(10))
    : parsed;
  if (options.allowNegative === false && valueAsRate < 0) {
    return failure("百分比不能为负数");
  }

  return success(valueAsRate);
}
