export interface PlanDateRange {
  startDate: string;
  endDate: string;
}

/**
 * Args: required existing ISO date range, optional schedule/deadline strings, and required IANA account time zone.
 * Input: an owned plan and form timestamps (ISO instants or browser-local datetime inputs); no persisted data changes.
 * Output: a new date range covering both the entire existing plan and every supplied timestamp in the account zone.
 * Errors: RangeError for a malformed/reversed plan range, invalid timestamp, or unsupported time zone; caller shows validation.
 */
export function requiredPlanRange(plan: PlanDateRange, times: readonly (string | null | undefined)[], timeZone: string): PlanDateRange {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(plan.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(plan.endDate) || plan.startDate > plan.endDate) {
    throw new RangeError("Khoảng ngày của kế hoạch không hợp lệ.");
  }
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const result = { startDate: plan.startDate, endDate: plan.endDate };
  for (const value of times) {
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) throw new RangeError("Thời gian của lịch hoặc nhiệm vụ không hợp lệ.");
    const parts = formatter.formatToParts(date);
    const day = ["year", "month", "day"].map((type) => parts.find((part) => part.type === type)?.value).join("-");
    if (day < result.startDate) result.startDate = day;
    if (day > result.endDate) result.endDate = day;
  }
  return result;
}

/** Args: required YYYY-MM-DD date. Input: Java plan date without time zone conversion. Output: DD/MM/YYYY label; no side effects. Errors: none; malformed input is returned unchanged. */
export function planDateLabel(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split("-").reverse().join("/") : value;
}
