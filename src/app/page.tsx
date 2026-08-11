"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MAX_DATE_RANGE_DAYS } from "@/lib/constants";
import { validateCreateEventInput } from "@/lib/eventInput";

export default function Home() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dayStartTime, setDayStartTime] = useState("09:00");
  const [dayEndTime, setDayEndTime] = useState("21:00");
  const [allDay, setAllDay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const input = {
      title,
      startDate,
      endDate,
      dayStartTime: allDay ? "00:00" : dayStartTime,
      dayEndTime: allDay ? "24:00" : dayEndTime,
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
        <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
          Pick a date range and daily time window. You&apos;ll get a link to
          share — no sign-in needed for you or anyone you send it to.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Title
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Team offsite"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-black outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
            />
          </label>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Start date
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-black outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              End date
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-black outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
              />
            </label>
          </div>
          <p className="-mt-3 text-xs text-zinc-500 dark:text-zinc-500">
            Up to {MAX_DATE_RANGE_DAYS} days.
          </p>

          <label className="-mb-2 flex items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="h-4 w-4"
            />
            All day (midnight to midnight)
          </label>

          {!allDay && (
            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Available from
                <input
                  type="time"
                  value={dayStartTime}
                  onChange={(e) => setDayStartTime(e.target.value)}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-black outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Until
                <input
                  type="time"
                  value={dayEndTime}
                  onChange={(e) => setDayEndTime(e.target.value)}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-black outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                />
              </label>
            </div>
          )}
          <p className="-mt-3 text-xs text-zinc-500 dark:text-zinc-500">
            Applied to every day in the range. No timezone conversion — use
            whatever timezone you have in mind.
            {allDay &&
              " For an overnight span, respondents can mark late slots on one day and early slots on the next."}
          </p>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-full bg-black px-5 py-2.5 text-base font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            {submitting ? "Creating…" : "Create event"}
          </button>
        </form>
      </main>
    </div>
  );
}
