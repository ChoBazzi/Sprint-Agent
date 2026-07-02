import { describe, expect, it } from "vitest";
import { buildMonthGrid, weekdays } from "../src/components/calendar/CalendarBoard";

describe("CalendarBoard month grid", () => {
  it("starts the calendar week on Sunday", () => {
    expect(weekdays).toEqual(["일", "월", "화", "수", "목", "금", "토"]);

    const days = buildMonthGrid(new Date(2026, 6, 1));

    expect(toDateKey(days[0])).toBe("2026-06-28");
    expect(toDateKey(days[1])).toBe("2026-06-29");
    expect(toDateKey(days[6])).toBe("2026-07-04");
  });
});

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}
