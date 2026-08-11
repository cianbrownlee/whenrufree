import { NextRequest, NextResponse } from "next/server";
import { getEventWithAggregate } from "@/lib/eventAggregate";

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
