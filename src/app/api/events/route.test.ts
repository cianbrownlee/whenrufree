import { NextRequest } from "next/server";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST as createEvent } from "./route";

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validInput = {
  title: "Integration Test Event",
  startDate: "2027-01-01",
  endDate: "2027-01-02",
  dayStartTime: "09:00",
  dayEndTime: "17:00",
};

describe("POST /api/events", () => {
  const createdEventIds: string[] = [];

  afterAll(async () => {
    if (createdEventIds.length === 0) return;
    await prisma.respondent.deleteMany({ where: { eventId: { in: createdEventIds } } });
    await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
  });

  it("creates an event and returns a random slug", async () => {
    const res = await createEvent(jsonRequest(validInput));
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(typeof data.slug).toBe("string");
    expect(data.slug.length).toBeGreaterThan(0);

    const event = await prisma.event.findUnique({ where: { slug: data.slug } });
    expect(event?.title).toBe(validInput.title);
    if (event) createdEventIds.push(event.id);
  });

  it("rejects a date range longer than the 31-day cap", async () => {
    const res = await createEvent(
      jsonRequest({ ...validInput, startDate: "2027-01-01", endDate: "2027-03-01" }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects a blank title", async () => {
    const res = await createEvent(jsonRequest({ ...validInput, title: "  " }));
    expect(res.status).toBe(400);
  });

  it("rejects an end time before the start time", async () => {
    const res = await createEvent(
      jsonRequest({ ...validInput, dayStartTime: "17:00", dayEndTime: "09:00" }),
    );
    expect(res.status).toBe(400);
  });
});
