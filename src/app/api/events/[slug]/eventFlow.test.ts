import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { GET as getEvent, PATCH as updateEvent } from "./route";
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

function patchRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "PATCH",
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
  let creatorToken: string;

  beforeEach(async () => {
    slug = `test-${nanoid(8)}`;
    creatorToken = nanoid();
    const event = await prisma.event.create({
      data: {
        slug,
        title: "Respond Flow Test",
        startDate: new Date("2027-02-01T00:00:00.000Z"),
        endDate: new Date("2027-02-01T00:00:00.000Z"),
        dayStartTime: "09:00",
        dayEndTime: "11:00",
        creatorToken,
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
        slotStarts: ["2027-02-01T09:00:00.000Z", "2027-02-01T10:00:00.000Z"],
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
        slotStarts: ["2027-02-01T09:00:00.000Z", "2027-02-01T10:00:00.000Z"],
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

  it("PATCH updates an event's title and window when given the correct creator token", async () => {
    const res = await updateEvent(
      patchRequest(`http://localhost/api/events/${slug}`, {
        creatorToken,
        title: "Updated Title",
        startDate: "2027-02-01",
        endDate: "2027-02-02",
        dayStartTime: "10:00",
        dayEndTime: "12:00",
      }),
      params(slug),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBe("Updated Title");
    expect(data.dayStartTime).toBe("10:00");
    expect(data.dayEndTime).toBe("12:00");

    const updated = await prisma.event.findUnique({ where: { id: eventId } });
    expect(updated?.title).toBe("Updated Title");
  });

  it("PATCH rejects a missing creator token", async () => {
    const res = await updateEvent(
      patchRequest(`http://localhost/api/events/${slug}`, {
        title: "Updated Title",
        startDate: "2027-02-01",
        endDate: "2027-02-01",
        dayStartTime: "09:00",
        dayEndTime: "11:00",
      }),
      params(slug),
    );
    expect(res.status).toBe(400);
  });

  it("PATCH rejects an incorrect creator token", async () => {
    const res = await updateEvent(
      patchRequest(`http://localhost/api/events/${slug}`, {
        creatorToken: "wrong-token",
        title: "Updated Title",
        startDate: "2027-02-01",
        endDate: "2027-02-01",
        dayStartTime: "09:00",
        dayEndTime: "11:00",
      }),
      params(slug),
    );
    expect(res.status).toBe(404);
  });

  it("PATCH rejects invalid field values", async () => {
    const res = await updateEvent(
      patchRequest(`http://localhost/api/events/${slug}`, {
        creatorToken,
        title: "",
        startDate: "2027-02-01",
        endDate: "2027-02-01",
        dayStartTime: "09:00",
        dayEndTime: "11:00",
      }),
      params(slug),
    );
    expect(res.status).toBe(400);
  });

  it("allows an existing past start date but rejects changing it to another past date", async () => {
    await prisma.event.update({
      where: { id: eventId },
      data: {
        startDate: new Date("2001-01-01T00:00:00.000Z"),
        endDate: new Date("2001-01-02T00:00:00.000Z"),
      },
    });

    const unchanged = await updateEvent(
      patchRequest(`http://localhost/api/events/${slug}`, {
        creatorToken,
        title: "Updated old event",
        startDate: "2001-01-01",
        endDate: "2001-01-02",
        dayStartTime: "09:00",
        dayEndTime: "11:00",
      }),
      params(slug),
    );
    expect(unchanged.status).toBe(200);

    const changed = await updateEvent(
      patchRequest(`http://localhost/api/events/${slug}`, {
        creatorToken,
        title: "Updated old event",
        startDate: "2001-01-02",
        endDate: "2001-01-03",
        dayStartTime: "09:00",
        dayEndTime: "11:00",
      }),
      params(slug),
    );
    expect(changed.status).toBe(400);
  });

  it("narrowing the window via PATCH drops now-out-of-window slots from the aggregate", async () => {
    await respond(
      jsonRequest(`http://localhost/api/events/${slug}/respond`, {
        name: "Alex",
        slotStarts: ["2027-02-01T10:00:00.000Z"],
      }),
      params(slug),
    );

    const patchRes = await updateEvent(
      patchRequest(`http://localhost/api/events/${slug}`, {
        creatorToken,
        title: "Respond Flow Test",
        startDate: "2027-02-01",
        endDate: "2027-02-01",
        dayStartTime: "09:00",
        dayEndTime: "10:00",
      }),
      params(slug),
    );
    expect(patchRes.status).toBe(200);

    const res = await getEvent(getRequest(`http://localhost/api/events/${slug}`), params(slug));
    const data = await res.json();
    expect(data.respondentCount).toBe(1);
    const slot = data.aggregate.find(
      (s: { slotStart: string }) => s.slotStart === "2027-02-01T10:00:00.000Z",
    );
    expect(slot).toBeUndefined();
  });
});
