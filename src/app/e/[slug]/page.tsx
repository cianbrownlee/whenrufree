import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) notFound();

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <main className="w-full max-w-3xl">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          {event.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {formatDate(event.startDate)} – {formatDate(event.endDate)},{" "}
          {event.dayStartTime}–{event.dayEndTime}
        </p>
        <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-500">
          The availability grid and respondent form go here (Phase 4).
        </p>
      </main>
    </div>
  );
}
