"use client";

import { useEffect, useMemo, useState } from "react";
import { generateSlots } from "@/lib/availability";
import { EventFieldsForm, EventFieldsValue } from "./EventFieldsForm";
import {
  clearStoredCreatorToken,
  getStoredCreatorToken,
} from "@/lib/creatorToken";
import { currentUtcDate, validateCreateEventInput } from "@/lib/eventInput";
import { groupSlotsByDay } from "@/lib/grid";
import { upsertMyEvent } from "@/lib/myEvents";
import {
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from "@/lib/respondentToken";
import { AvailabilityGrid } from "./AvailabilityGrid";

interface AggregateEntry {
  slotStart: string;
  count: number;
  names: string[];
}

interface EventViewProps {
  slug: string;
  title: string;
  startDate: string;
  endDate: string;
  dayStartTime: string;
  dayEndTime: string;
  initialAggregate: AggregateEntry[];
  initialRespondentCount: number;
}

export function EventView({
  slug,
  title: initialTitle,
  startDate: initialStartDate,
  endDate: initialEndDate,
  dayStartTime: initialDayStartTime,
  dayEndTime: initialDayEndTime,
  initialAggregate,
  initialRespondentCount,
}: EventViewProps) {
  const [title, setTitle] = useState(initialTitle);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [dayStartTime, setDayStartTime] = useState(initialDayStartTime);
  const [dayEndTime, setDayEndTime] = useState(initialDayEndTime);

  const slotsByDay = useMemo(
    () =>
      groupSlotsByDay(
        generateSlots(new Date(startDate), new Date(endDate), dayStartTime, dayEndTime),
      ),
    [startDate, endDate, dayStartTime, dayEndTime],
  );

  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [token, setToken] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [aggregate, setAggregate] = useState<Map<string, { count: number; names: string[] }>>(
    () => new Map(initialAggregate.map((e) => [e.slotStart, { count: e.count, names: e.names }])),
  );
  const [respondentCount, setRespondentCount] = useState(initialRespondentCount);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [creatorToken, setCreatorToken] = useState<string | null>(null);
  const [showEventEditForm, setShowEventEditForm] = useState(false);
  const [eventEditValue, setEventEditValue] = useState<EventFieldsValue | null>(null);
  const [eventEditSubmitting, setEventEditSubmitting] = useState(false);
  const [eventEditError, setEventEditError] = useState<string | null>(null);
  const [eventSavedAt, setEventSavedAt] = useState<number | null>(null);

  useEffect(() => {
    const stored = getStoredToken(slug);
    const creator = getStoredCreatorToken(slug);
    queueMicrotask(() => setCreatorToken(creator));
    if (stored) {
      upsertMyEvent({
        slug,
        title,
        startDate: startDate.slice(0, 10),
        endDate: endDate.slice(0, 10),
        role: "respondent",
      });
    }
    if (creator) {
      upsertMyEvent({
        slug,
        title,
        startDate: startDate.slice(0, 10),
        endDate: endDate.slice(0, 10),
        role: "creator",
      });
    }
    if (!stored) return;

    let cancelled = false;
    fetch(`/api/events/${slug}/respondent?token=${encodeURIComponent(stored)}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          clearStoredToken(slug);
          return;
        }
        const data = await res.json();
        setToken(stored);
        setIsEditing(true);
        setName(data.name);
        setSelected(new Set<string>(data.slotStarts));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    // Intentionally mount-once: title/startDate/endDate are only read here to
    // seed the "my events" cache, not to keep this effect reactively synced.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function refetchAggregate() {
    const res = await fetch(`/api/events/${slug}`);
    if (!res.ok) return;
    const data = await res.json();
    setAggregate(
      new Map(
        (data.aggregate as AggregateEntry[]).map((e) => [
          e.slotStart,
          { count: e.count, names: e.names },
        ]),
      ),
    );
    setRespondentCount(data.respondentCount);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!name.trim()) {
      setSubmitError("Name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${slug}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token ?? undefined,
          name,
          slotStarts: Array.from(selected),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Something went wrong.");
        return;
      }
      setToken(data.token);
      setStoredToken(slug, data.token);
      setIsEditing(true);
      setSavedAt(Date.now());
      upsertMyEvent({
        slug,
        title,
        startDate: startDate.slice(0, 10),
        endDate: endDate.slice(0, 10),
        role: "respondent",
      });
      await refetchAggregate();
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function openEventEditForm() {
    const allDay = dayStartTime === "00:00" && dayEndTime === "24:00";
    setEventEditValue({
      title,
      startDate: startDate.slice(0, 10),
      endDate: endDate.slice(0, 10),
      dayStartTime: allDay ? "09:00" : dayStartTime,
      dayEndTime: allDay ? "21:00" : dayEndTime,
      allDay,
    });
    setEventEditError(null);
    setShowEventEditForm(true);
  }

  const editWillChangeWindow =
    respondentCount > 0 &&
    eventEditValue !== null &&
    (eventEditValue.startDate !== startDate.slice(0, 10) ||
      eventEditValue.endDate !== endDate.slice(0, 10) ||
      (eventEditValue.allDay ? "00:00" : eventEditValue.dayStartTime) !== dayStartTime ||
      (eventEditValue.allDay ? "24:00" : eventEditValue.dayEndTime) !== dayEndTime);

  const existingStartDate = startDate.slice(0, 10);
  const today = currentUtcDate();
  const eventEditMinimumStartDate =
    existingStartDate < today && eventEditValue?.startDate === existingStartDate
      ? undefined
      : today;

  async function handleEventEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!eventEditValue || !creatorToken) return;
    setEventEditError(null);

    const input = {
      title: eventEditValue.title,
      startDate: eventEditValue.startDate,
      endDate: eventEditValue.endDate,
      dayStartTime: eventEditValue.allDay ? "00:00" : eventEditValue.dayStartTime,
      dayEndTime: eventEditValue.allDay ? "24:00" : eventEditValue.dayEndTime,
    };
    const validated = validateCreateEventInput(input, {
      minimumStartDate: today,
      allowedStartDate: existingStartDate,
    });
    if (!validated.ok) {
      setEventEditError(validated.error);
      return;
    }

    setEventEditSubmitting(true);
    try {
      const res = await fetch(`/api/events/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorToken, ...input }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404) {
          clearStoredCreatorToken(slug);
          setCreatorToken(null);
          setShowEventEditForm(false);
        }
        setEventEditError(data.error ?? "Something went wrong.");
        return;
      }
      setTitle(data.title);
      setStartDate(data.startDate);
      setEndDate(data.endDate);
      setDayStartTime(data.dayStartTime);
      setDayEndTime(data.dayEndTime);
      setShowEventEditForm(false);
      setEventSavedAt(Date.now());
      await refetchAggregate();
      upsertMyEvent({
        slug,
        title: data.title,
        startDate: data.startDate.slice(0, 10),
        endDate: data.endDate.slice(0, 10),
        role: "creator",
      });
    } catch {
      setEventEditError("Something went wrong. Please try again.");
    } finally {
      setEventEditSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <main className="w-full max-w-3xl">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            {title}
          </h1>
          {creatorToken && !showEventEditForm && (
            <button
              type="button"
              onClick={openEventEditForm}
              className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100"
            >
              Edit event
            </button>
          )}
        </div>
        <p className="mt-1 mb-8 text-sm text-zinc-600 dark:text-zinc-400">
          {respondentCount} {respondentCount === 1 ? "response" : "responses"} so far.
        </p>

        {showEventEditForm && eventEditValue && (
          <form onSubmit={handleEventEditSubmit} className="mb-10 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
            <EventFieldsForm
              value={eventEditValue}
              onChange={setEventEditValue}
              minimumStartDate={eventEditMinimumStartDate}
            />
            {editWillChangeWindow && (
              <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                {respondentCount} {respondentCount === 1 ? "response" : "responses"} already
                submitted. Changing the dates or time window may make some of their answers
                disappear from the results.
              </p>
            )}
            {eventEditError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{eventEditError}</p>
            )}
            <div className="mt-4 flex items-center gap-3">
              <button
                type="submit"
                disabled={eventEditSubmitting}
                className="rounded-full bg-black px-5 py-2.5 text-base font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                {eventEditSubmitting ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => setShowEventEditForm(false)}
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Cancel
              </button>
              {eventSavedAt && !eventEditSubmitting && (
                <span className="text-sm text-zinc-500 dark:text-zinc-500">Saved.</span>
              )}
            </div>
          </form>
        )}

        <form onSubmit={handleSubmit} className="mb-10">
          <label className="mb-3 flex max-w-xs flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Your name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jamie"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-black outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
            />
          </label>
          <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
            Click and drag to mark when you&apos;re free.
          </p>
          <AvailabilityGrid
            mode="edit"
            slotsByDay={slotsByDay}
            selected={selected}
            onSelectedChange={setSelected}
          />
          {submitError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{submitError}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="mt-4 rounded-full bg-black px-5 py-2.5 text-base font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            {submitting ? "Saving…" : isEditing ? "Update availability" : "Submit availability"}
          </button>
          {savedAt && !submitting && (
            <span className="ml-3 text-sm text-zinc-500 dark:text-zinc-500">Saved.</span>
          )}
        </form>

        <h2 className="mb-2 text-lg font-semibold text-black dark:text-zinc-50">
          Group availability
        </h2>
        <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
          Darker means more people are free. Hover a slot to see who.
        </p>
        <AvailabilityGrid mode="aggregate" slotsByDay={slotsByDay} aggregate={aggregate} maxCount={respondentCount} />
      </main>
    </div>
  );
}
