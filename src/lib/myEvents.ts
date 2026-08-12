export interface MyEventEntry {
  slug: string;
  title: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string;
  isCreator: boolean;
  isRespondent: boolean;
  updatedAt: number;
}

const STORAGE_KEY = "whenrufree:myEvents";

export function getMyEvents(): MyEventEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: MyEventEntry[] = raw ? JSON.parse(raw) : [];
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function upsertMyEvent(entry: {
  slug: string;
  title: string;
  startDate: string;
  endDate: string;
  role: "creator" | "respondent";
}): void {
  if (typeof window === "undefined") return;
  const all = getMyEvents();
  const existing = all.find((e) => e.slug === entry.slug);
  const merged: MyEventEntry = {
    slug: entry.slug,
    title: entry.title,
    startDate: entry.startDate,
    endDate: entry.endDate,
    isCreator: entry.role === "creator" || existing?.isCreator === true,
    isRespondent: entry.role === "respondent" || existing?.isRespondent === true,
    updatedAt: Date.now(),
  };
  const next = [merged, ...all.filter((e) => e.slug !== entry.slug)];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
