import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { currentUtcDate, validateCreateEventInput } from "@/lib/eventInput";
import { prisma } from "@/lib/prisma";

const SLUG_LENGTH = 10;
const MAX_SLUG_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const validated = validateCreateEventInput(body, {
    minimumStartDate: currentUtcDate(),
  });
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  const { title, startDate, endDate, dayStartTime, dayEndTime } = validated.data;

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const slug = nanoid(SLUG_LENGTH);
    try {
      const event = await prisma.event.create({
        data: { slug, title, startDate, endDate, dayStartTime, dayEndTime, creatorToken: nanoid() },
      });
      return NextResponse.json(
        { slug: event.slug, creatorToken: event.creatorToken },
        { status: 201 },
      );
    } catch (error) {
      const isSlugCollision =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002";
      if (!isSlugCollision) throw error;
    }
  }

  return NextResponse.json(
    { error: "Could not generate a unique link. Please try again." },
    { status: 500 },
  );
}
