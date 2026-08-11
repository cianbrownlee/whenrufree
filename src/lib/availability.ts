const SLOT_MINUTES = 60;
const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Every hourly slot start across each day in [startDate, endDate], within
 * [dayStartTime, dayEndTime) on each of those days. All arithmetic is done in
 * UTC so results are independent of the host machine's timezone — per the
 * product spec, there is no per-visitor timezone conversion.
 */
export function generateSlots(
  startDate: Date,
  endDate: Date,
  dayStartTime: string,
  dayEndTime: string,
): Date[] {
  const startMinutes = parseTimeToMinutes(dayStartTime);
  const endMinutes = parseTimeToMinutes(dayEndTime);

  const dayStart = Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate(),
  );
  const dayEnd = Date.UTC(
    endDate.getUTCFullYear(),
    endDate.getUTCMonth(),
    endDate.getUTCDate(),
  );

  const slots: Date[] = [];
  for (let day = dayStart; day <= dayEnd; day += MS_PER_DAY) {
    for (
      let minutes = startMinutes;
      minutes + SLOT_MINUTES <= endMinutes;
      minutes += SLOT_MINUTES
    ) {
      slots.push(new Date(day + minutes * MS_PER_MINUTE));
    }
  }
  return slots;
}

export interface AvailabilityAggregate {
  count: number;
  names: string[];
}

/**
 * For every slot in `allSlotStarts`, count how many respondents marked it
 * available and who they are. Slots nobody picked still appear, with count 0.
 */
export function aggregateAvailability(
  slots: { slotStart: Date; respondentName: string }[],
  allSlotStarts: Date[],
): Map<string, AvailabilityAggregate> {
  const aggregate = new Map<string, AvailabilityAggregate>();
  for (const slotStart of allSlotStarts) {
    aggregate.set(slotStart.toISOString(), { count: 0, names: [] });
  }

  for (const { slotStart, respondentName } of slots) {
    const key = slotStart.toISOString();
    const entry = aggregate.get(key);
    if (!entry) continue;
    entry.count += 1;
    entry.names.push(respondentName);
  }

  return aggregate;
}
