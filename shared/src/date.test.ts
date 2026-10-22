import { describe, expect, it } from "vitest";
import { addDays, toDayKey } from "./date.ts";

describe("date helpers", () => {
  it("formats local day keys", () => {
    expect(toDayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
});
