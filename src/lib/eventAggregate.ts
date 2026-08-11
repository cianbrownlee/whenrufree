import { aggregateAvailability, generateSlots } from "@/lib/availability";
import { prisma } from "@/lib/prisma";

export async function getEventWithAggregate(slug: string) {
  const event = await prisma.event.findUnique({
    where: { slug },
    include: { respondents: { include: { availability: true } } },
  });
  if (!event) return null;

  const allSlotStarts = generateSlots(
    event.startDate,
    event.endDate,
    event.dayStartTime,
    event.dayEndTime,
  );
  const slots = event.respondents.flatMap((respondent) =>
    respondent.availability.map((slot) => ({
      slotStart: slot.slotStart,
      respondentName: respondent.name,
    })),
  );
  const aggregate = aggregateAvailability(slots, allSlotStarts);

  return {
    event,
    respondentCount: event.respondents.length,
    aggregate: Array.from(aggregate.entries()).map(([slotStart, entry]) => ({
      slotStart,
      count: entry.count,
      names: entry.names,
    })),
  };
}
