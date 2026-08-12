import { NextRequest, NextResponse } from "next/server";
import { getEventWithAggregate } from "@/lib/eventAggregate";
import { validateCreateEventInput } from "@/lib/eventInput";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const result = await getEventWithAggregate(slug);
  if (!result) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const { event, respondentCount, aggregate } = result;
  return NextResponse.json({
    title: event.title,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate.toISOString(),
    dayStartTime: event.dayStartTime,
    dayEndTime: event.dayEndTime,
    respondentCount,
    aggregate,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body.creatorToken !== "string" || !body.creatorToken) {
    return NextResponse.json({ error: "Missing creator token." }, { status: 400 });
  }

  const validated = validateCreateEventInput(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const event = await prisma.event.findFirst({
    where: { slug, creatorToken: body.creatorToken },
  });
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const updated = await prisma.event.update({
    where: { id: event.id },
    data: validated.data,
  });

  return NextResponse.json({
    title: updated.title,
    startDate: updated.startDate.toISOString(),
    endDate: updated.endDate.toISOString(),
    dayStartTime: updated.dayStartTime,
    dayEndTime: updated.dayEndTime,
  });
}
