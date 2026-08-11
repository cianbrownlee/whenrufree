import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { GET as getEvent } from "./route";
import { POST as respond } from "./respond/route";
import { GET as getRespondent } from "./respondent/route";

function params(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

function jsonRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getRequest(url: string) {
  return new NextRequest(url, { method: "GET" });
}

describe("event slug API routes", () => {
  let eventId: string;
  let slug: string;

  beforeEach(async () => {
    slug = `test-${nanoid(8)}`;
    const event = await prisma.event.create({
      data: {
        slug,
        title: "Respond Flow Test",
        startDate: new Date("2027-02-01T00:00:00.000Z"),
        endDate: new Date("2027-02-01T00:00:00.000Z"),
        dayStartTime: "09:00",
        dayEndTime: "11:00",
      },
    });
    eventId = event.id;
  });

  afterEach(async () => {
    await prisma.respondent.deleteMany({ where: { eventId } });
    await prisma.event.delete({ where: { id: eventId } });
  });

  it("GET returns 404 for an unknown slug", async () => {
    const res = await getEvent(getRequest("http://localhost/api/events/does-not-exist"), params("does-not-exist"));
    expect(res.status).toBe(404);
  });

  it("creates a new respondent on first submission and returns a token", async () => {
    const res = await respond(
      jsonRequest(`http://localhost/api/events/${slug}/respond`, {
        name: "Alex",
        slotStarts: ["2027-02-01T09:00:00.000Z", "2027-02-01T09:30:00.000Z"],
      }),
      params(slug),
    );
    expect(res.status).toBe(200);
    const { token } = await res.json();
    expect(typeof token).toBe("string");

    const respondents = await prisma.respondent.findMany({ where: { eventId } });
    expect(respondents).toHaveLength(1);
    expect(respondents[0].name).toBe("Alex");
  });

  it("replaces rather than accumulates slots when resubmitting with the same token", async () => {
    const first = await respond(
      jsonRequest(`http://localhost/api/events/${slug}/respond`, {
        name: "Alex",
        slotStarts: ["2027-02-01T09:00:00.000Z", "2027-02-01T09:30:00.000Z"],
      }),
      params(slug),
    );
    const { token } = await first.json();

    const second = await respond(
      jsonRequest(`http://localhost/api/events/${slug}/respond`, {
        token,
        name: "Alex",
        slotStarts: ["2027-02-01T10:00:00.000Z"],
      }),
      params(slug),
    );
    expect(second.status).toBe(200);

    const respondents = await prisma.respondent.findMany({
      where: { eventId },
      include: { availability: true },
    });
    expect(respondents).toHaveLength(1);
    expect(respondents[0].availability.map((s) => s.slotStart.toISOString())).toEqual([
      "2027-02-01T10:00:00.000Z",
    ]);
  });

  it("accepts zero selected slots as a valid response", async () => {
    const res = await respond(
      jsonRequest(`http://localhost/api/events/${slug}/respond`, {
        name: "Sam",
        slotStarts: [],
      }),
      params(slug),
    );
    expect(res.status).toBe(200);

    const respondents = await prisma.respondent.findMany({
      where: { eventId },
      include: { availability: true },
    });
    expect(respondents).toHaveLength(1);
    expect(respondents[0].availability).toHaveLength(0);
  });

  it("silently drops slots outside the event's valid window", async () => {
    const res = await respond(
      jsonRequest(`http://localhost/api/events/${slug}/respond`, {
        name: "Alex",
        slotStarts: ["2027-02-01T09:00:00.000Z", "2027-02-01T23:00:00.000Z"],
      }),
      params(slug),
    );
    expect(res.status).toBe(200);

    const respondents = await prisma.respondent.findMany({
      where: { eventId },
      include: { availability: true },
    });
    expect(respondents[0].availability).toHaveLength(1);
  });

  it("GET respondent requires a token", async () => {
    const res = await getRespondent(
      getRequest(`http://localhost/api/events/${slug}/respondent`),
      params(slug),
    );
    expect(res.status).toBe(400);
  });

  it("GET respondent returns 404 for an unknown token", async () => {
    const res = await getRespondent(
      getRequest(`http://localhost/api/events/${slug}/respondent?token=bogus`),
      params(slug),
    );
    expect(res.status).toBe(404);
  });

  it("GET respondent returns the respondent's prior selections", async () => {
    const submitted = await respond(
      jsonRequest(`http://localhost/api/events/${slug}/respond`, {
        name: "Alex",
        slotStarts: ["2027-02-01T09:00:00.000Z"],
      }),
      params(slug),
    );
    const { token } = await submitted.json();

    const res = await getRespondent(
      getRequest(`http://localhost/api/events/${slug}/respondent?token=${token}`),
      params(slug),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("Alex");
    expect(data.slotStarts).toEqual(["2027-02-01T09:00:00.000Z"]);
  });

  it("GET event reflects submitted availability in the aggregate", async () => {
    await respond(
      jsonRequest(`http://localhost/api/events/${slug}/respond`, {
        name: "Alex",
        slotStarts: ["2027-02-01T09:00:00.000Z"],
      }),
      params(slug),
    );

    const res = await getEvent(getRequest(`http://localhost/api/events/${slug}`), params(slug));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.respondentCount).toBe(1);
    const slot = data.aggregate.find((s: { slotStart: string }) => s.slotStart === "2027-02-01T09:00:00.000Z");
    expect(slot).toEqual({ slotStart: "2027-02-01T09:00:00.000Z", count: 1, names: ["Alex"] });
  });
});
