import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  const respondent = await prisma.respondent.findFirst({
    where: { respondentToken: token, event: { slug } },
    include: { availability: true },
  });
  if (!respondent) {
    return NextResponse.json({ error: "Respondent not found." }, { status: 404 });
  }

  return NextResponse.json({
    name: respondent.name,
    slotStarts: respondent.availability.map((slot) => slot.slotStart.toISOString()),
  });
}
