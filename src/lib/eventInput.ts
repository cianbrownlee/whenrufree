import { MAX_DATE_RANGE_DAYS } from "@/lib/constants";

export interface CreateEventInput {
  title: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  dayStartTime: string; // "HH:MM"
  dayEndTime: string; // "HH:MM"
}

export interface ValidatedEventInput {
  title: string;
  startDate: Date;
  endDate: Date;
  dayStartTime: string;
  dayEndTime: string;
}

interface EventInputValidationOptions {
  minimumStartDate?: string; // "YYYY-MM-DD"
  allowedStartDate?: string; // permits an existing event to retain a past date
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
// "24:00" is a valid dayEndTime meaning midnight at the end of the day (an
// "all day" window), so the last hourly slot of the day is included.
const END_OF_DAY = "24:00";

export function currentUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function validateCreateEventInput(
  input: CreateEventInput,
  options: EventInputValidationOptions = {},
): { ok: true; data: ValidatedEventInput } | { ok: false; error: string } {
  const title = input.title?.trim() ?? "";
  if (!title) return { ok: false, error: "Title is required." };
  if (title.length > 200) return { ok: false, error: "Title is too long." };

  if (!DATE_RE.test(input.startDate) || !DATE_RE.test(input.endDate)) {
    return { ok: false, error: "Invalid date." };
  }
  const startDate = new Date(`${input.startDate}T00:00:00.000Z`);
  const endDate = new Date(`${input.endDate}T00:00:00.000Z`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { ok: false, error: "Invalid date." };
  }
  if (
    options.minimumStartDate &&
    input.startDate < options.minimumStartDate &&
    input.startDate !== options.allowedStartDate
  ) {
    return { ok: false, error: "Start date can't be in the past." };
  }
  if (endDate < startDate) {
    return { ok: false, error: "End date must be on or after start date." };
  }
  const rangeDays =
    Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
  if (rangeDays > MAX_DATE_RANGE_DAYS) {
    return {
      ok: false,
      error: `Date range can't be longer than ${MAX_DATE_RANGE_DAYS} days.`,
    };
  }

  const dayEndValid = TIME_RE.test(input.dayEndTime) || input.dayEndTime === END_OF_DAY;
  if (!TIME_RE.test(input.dayStartTime) || !dayEndValid) {
    return { ok: false, error: "Invalid time." };
  }
  if (input.dayStartTime >= input.dayEndTime) {
    return { ok: false, error: "Start time must be before end time." };
  }

  return {
    ok: true,
    data: {
      title,
      startDate,
      endDate,
      dayStartTime: input.dayStartTime,
      dayEndTime: input.dayEndTime,
    },
  };
}
