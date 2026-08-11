import { notFound } from "next/navigation";
import { getEventWithAggregate } from "@/lib/eventAggregate";
import { EventView } from "@/components/EventView";

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getEventWithAggregate(slug);
  if (!result) notFound();

  const { event, respondentCount, aggregate } = result;
  return (
    <EventView
      slug={event.slug}
      title={event.title}
      startDate={event.startDate.toISOString()}
      endDate={event.endDate.toISOString()}
      dayStartTime={event.dayStartTime}
      dayEndTime={event.dayEndTime}
      initialRespondentCount={respondentCount}
      initialAggregate={aggregate}
    />
  );
}
