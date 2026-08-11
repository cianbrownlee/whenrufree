import { describe, expect, it } from "vitest";
import { aggregateAvailability, generateSlots } from "./availability";

describe("generateSlots", () => {
  it("generates 30-minute slots across a single day within the window", () => {
    const day = new Date(Date.UTC(2026, 0, 1));
    const slots = generateSlots(day, day, "09:00", "10:30");

    expect(slots.map((s) => s.toISOString())).toEqual([
      "2026-01-01T09:00:00.000Z",
      "2026-01-01T09:30:00.000Z",
      "2026-01-01T10:00:00.000Z",
    ]);
  });

  it("excludes a slot that would start exactly at dayEndTime", () => {
    const day = new Date(Date.UTC(2026, 0, 1));
    const slots = generateSlots(day, day, "09:00", "09:30");

    expect(slots).toHaveLength(1);
    expect(slots[0].toISOString()).toBe("2026-01-01T09:00:00.000Z");
  });

  it("includes the first slot starting exactly at dayStartTime", () => {
    const day = new Date(Date.UTC(2026, 0, 1));
    const slots = generateSlots(day, day, "09:00", "09:30");

    expect(slots[0].toISOString()).toBe("2026-01-01T09:00:00.000Z");
  });

  it("repeats the same daily window across a multi-day range", () => {
    const start = new Date(Date.UTC(2026, 0, 1));
    const end = new Date(Date.UTC(2026, 0, 2));
    const slots = generateSlots(start, end, "09:00", "10:00");

    expect(slots.map((s) => s.toISOString())).toEqual([
      "2026-01-01T09:00:00.000Z",
      "2026-01-01T09:30:00.000Z",
      "2026-01-02T09:00:00.000Z",
      "2026-01-02T09:30:00.000Z",
    ]);
  });

  it("returns an empty array when the window is shorter than one slot", () => {
    const day = new Date(Date.UTC(2026, 0, 1));
    expect(generateSlots(day, day, "09:00", "09:15")).toEqual([]);
  });

  it("covers the full 24 hours for an all-day window (00:00-24:00)", () => {
    const day = new Date(Date.UTC(2026, 0, 1));
    const slots = generateSlots(day, day, "00:00", "24:00");

    expect(slots).toHaveLength(48);
    expect(slots[0].toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(slots[slots.length - 1].toISOString()).toBe("2026-01-01T23:30:00.000Z");
  });
});

describe("aggregateAvailability", () => {
  const allSlots = generateSlots(
    new Date(Date.UTC(2026, 0, 1)),
    new Date(Date.UTC(2026, 0, 1)),
    "09:00",
    "10:00",
  );
  const [slot0900, slot0930] = allSlots;

  it("counts overlapping respondents on the same slot", () => {
    const result = aggregateAvailability(
      [
        { slotStart: slot0900, respondentName: "Alex" },
        { slotStart: slot0900, respondentName: "Sam" },
      ],
      allSlots,
    );

    expect(result.get(slot0900.toISOString())).toEqual({
      count: 2,
      names: ["Alex", "Sam"],
    });
  });

  it("leaves a slot nobody picked at count 0 with no names", () => {
    const result = aggregateAvailability(
      [{ slotStart: slot0900, respondentName: "Alex" }],
      allSlots,
    );

    expect(result.get(slot0930.toISOString())).toEqual({
      count: 0,
      names: [],
    });
  });

  it("handles a respondent with zero selections without affecting other counts", () => {
    // A zero-selection respondent simply contributes no entries to `slots` —
    // this function has no notion of "respondents", only marked slots.
    const result = aggregateAvailability(
      [{ slotStart: slot0900, respondentName: "Alex" }],
      allSlots,
    );

    expect(result.get(slot0900.toISOString())?.count).toBe(1);
  });

  it("produces an entry for every slot even with zero respondents", () => {
    const result = aggregateAvailability([], allSlots);

    expect(result.size).toBe(allSlots.length);
    for (const entry of result.values()) {
      expect(entry).toEqual({ count: 0, names: [] });
    }
  });

  it("covers the exact start and end boundary slots of the window", () => {
    const result = aggregateAvailability(
      [
        { slotStart: allSlots[0], respondentName: "Alex" },
        { slotStart: allSlots[allSlots.length - 1], respondentName: "Sam" },
      ],
      allSlots,
    );

    expect(result.get(allSlots[0].toISOString())?.count).toBe(1);
    expect(result.get(allSlots[allSlots.length - 1].toISOString())?.count).toBe(1);
  });

  it("ignores a slot that isn't part of allSlotStarts", () => {
    const outsideSlot = new Date(Date.UTC(2026, 0, 1, 23, 0));
    const result = aggregateAvailability(
      [{ slotStart: outsideSlot, respondentName: "Alex" }],
      allSlots,
    );

    expect(result.get(outsideSlot.toISOString())).toBeUndefined();
    for (const entry of result.values()) {
      expect(entry.count).toBe(0);
    }
  });
});
