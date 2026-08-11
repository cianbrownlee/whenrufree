export function groupSlotsByDay(slots: Date[]): Date[][] {
  const days: Date[][] = [];
  let currentDayKey = "";
  for (const slot of slots) {
    const dayKey = slot.toISOString().slice(0, 10);
    if (dayKey !== currentDayKey) {
      days.push([]);
      currentDayKey = dayKey;
    }
    days[days.length - 1].push(slot);
  }
  return days;
}

export function formatDayLabel(day: Date): string {
  return day.toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatTimeLabel(slot: Date): string {
  const hours = slot.getUTCHours();
  const minutes = slot.getUTCMinutes();
  const period = hours < 12 ? "AM" : "PM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
}
