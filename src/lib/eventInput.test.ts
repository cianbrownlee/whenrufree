import { afterEach, describe, expect, it, vi } from "vitest";
import {
  currentDateForTimezoneOffset,
  validateCreateEventInput,
} from "./eventInput";

const base = {
  title: "Birthday Party",
  startDate: "2026-09-01",
  endDate: "2026-09-02",
  dayStartTime: "09:00",
  dayEndTime: "21:00",
};

describe("validateCreateEventInput", () => {
  afterEach(() => vi.useRealTimers());

  it("uses the visitor's local date near a UTC day boundary", () => {
    vi.setSystemTime(new Date("2026-08-16T00:05:00.000Z"));

    expect(currentDateForTimezoneOffset(300)).toBe("2026-08-15");
  });

  it("accepts a normal daily window", () => {
    expect(validateCreateEventInput(base).ok).toBe(true);
  });

  it("accepts 00:00-24:00 as an all-day window", () => {
    const result = validateCreateEventInput({
      ...base,
      dayStartTime: "00:00",
      dayEndTime: "24:00",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.dayStartTime).toBe("00:00");
      expect(result.data.dayEndTime).toBe("24:00");
    }
  });

  it("rejects 24:00 as a dayStartTime", () => {
    const result = validateCreateEventInput({ ...base, dayStartTime: "24:00" });
    expect(result.ok).toBe(false);
  });

  it("rejects any other out-of-range time", () => {
    const result = validateCreateEventInput({ ...base, dayEndTime: "25:00" });
    expect(result.ok).toBe(false);
  });

  it("still rejects a start time on or after the end time when both are normal", () => {
    const result = validateCreateEventInput({
      ...base,
      dayStartTime: "21:00",
      dayEndTime: "09:00",
    });
    expect(result.ok).toBe(false);
  });

  it("enforces a minimum start date while allowing an existing past date", () => {
    const options = { minimumStartDate: "2026-09-01" };

    expect(
      validateCreateEventInput(
        { ...base, startDate: "2026-08-31", endDate: "2026-08-31" },
        options,
      ),
    ).toEqual({ ok: false, error: "Start date can't be in the past." });
    expect(validateCreateEventInput(base, options).ok).toBe(true);
    expect(
      validateCreateEventInput(
        { ...base, startDate: "2026-08-31", endDate: "2026-08-31" },
        { ...options, allowedStartDate: "2026-08-31" },
      ).ok,
    ).toBe(true);
  });
});
