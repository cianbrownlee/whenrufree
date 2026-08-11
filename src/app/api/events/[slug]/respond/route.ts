import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { generateSlots } from "@/lib/availability";
import { prisma } from "@/lib/prisma";

interface RespondBody {
  token?: string;
  name?: string;
  slotStarts?: string[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body: RespondBody | null = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (name.length > 100) {
    return NextResponse.json({ error: "Name is too long." }, { status: 400 });
  }
  if (!Array.isArray(body.slotStarts)) {
    return NextResponse.json({ error: "Invalid availability." }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const validSlotStarts = new Set(
    generateSlots(
      event.startDate,
      event.endDate,
      event.dayStartTime,
      event.dayEndTime,
    ).map((slot) => slot.toISOString()),
  );
  const slotDates = [...new Set(body.slotStarts)]
    .filter((iso) => validSlotStarts.has(iso))
    .map((iso) => new Date(iso));

  const token = await prisma.$transaction(async (tx) => {
    const existing = body.token
      ? await tx.respondent.findFirst({
          where: { respondentToken: body.token, eventId: event.id },
        })
      : null;

    const respondent = existing
      ? await tx.respondent.update({
          where: { id: existing.id },
          data: { name },
        })
      : await tx.respondent.create({
          data: { eventId: event.id, name, respondentToken: nanoid() },
        });

    await tx.availabilitySlot.deleteMany({
      where: { respondentId: respondent.id },
    });
    if (slotDates.length > 0) {
      await tx.availabilitySlot.createMany({
        data: slotDates.map((slotStart) => ({
          respondentId: respondent.id,
          slotStart,
        })),
      });
    }

    return respondent.respondentToken;
  });

  return NextResponse.json({ token }, { status: 200 });
}
