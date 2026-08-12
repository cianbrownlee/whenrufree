"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EventFieldsForm, EventFieldsValue } from "@/components/EventFieldsForm";
import { setStoredCreatorToken } from "@/lib/creatorToken";
import { validateCreateEventInput } from "@/lib/eventInput";
import { getMyEvents, MyEventEntry, upsertMyEvent } from "@/lib/myEvents";

const EMPTY_FORM_VALUE: EventFieldsValue = {
  title: "",
  startDate: "",
  endDate: "",
  dayStartTime: "09:00",
  dayEndTime: "21:00",
  allDay: false,
};

function formatDateRange(startDate: string, endDate: string): string {
  const format = (d: string) =>
    new Date(`${d}T00:00:00.000Z`).toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
    });
  return startDate === endDate ? format(startDate) : `${format(startDate)} – ${format(endDate)}`;
}

function roleLabel(entry: MyEventEntry): string {
  if (entry.isCreator && entry.isRespondent) return "Host · Responded";
  if (entry.isCreator) return "Host";
  return "Responded";
}

export default function Home() {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [myEvents, setMyEvents] = useState<MyEventEntry[] | null>(null);
  const [formValue, setFormValue] = useState<EventFieldsValue>(EMPTY_FORM_VALUE);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMyEvents(getMyEvents()));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const input = {
      title: formValue.title,
      startDate: formValue.startDate,
      endDate: formValue.endDate,
      dayStartTime: formValue.allDay ? "00:00" : formValue.dayStartTime,
      dayEndTime: formValue.allDay ? "24:00" : formValue.dayEndTime,
    };
    const validated = validateCreateEventInput(input);
    if (!validated.ok) {
      setError(validated.error);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setStoredCreatorToken(data.slug, data.creatorToken);
      upsertMyEvent({
        slug: data.slug,
        title: formValue.title,
        startDate: formValue.startDate,
        endDate: formValue.endDate,
        role: "creator",
      });
      router.push(`/e/${data.slug}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <main className="w-full max-w-md">
        <h1 className="mb-1 text-2xl font-semibold text-black dark:text-zinc-50">
          whenrufree
        </h1>

        {!showCreateForm && (
          <>
            <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
              Pick a date range and daily time window. You&apos;ll get a link
              to share — no sign-in needed for you or anyone you send it to.
            </p>

            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="rounded-full bg-black px-5 py-2.5 text-base font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Create event
            </button>

            {myEvents && myEvents.length > 0 && (
              <section className="mt-10">
                <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Your events
                </h2>
                <ul className="flex flex-col gap-2">
                  {myEvents.map((event) => (
                    <li key={event.slug}>
                      <Link
                        href={`/e/${event.slug}`}
                        className="flex flex-col rounded-md border border-zinc-200 px-3 py-2 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                      >
                        <span className="text-sm font-medium text-black dark:text-zinc-50">
                          {event.title}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-500">
                          {formatDateRange(event.startDate, event.endDate)} · {roleLabel(event)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {showCreateForm && (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
            <EventFieldsForm value={formValue} onChange={setFormValue} />

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-black px-5 py-2.5 text-base font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                {submitting ? "Creating…" : "Create event"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
