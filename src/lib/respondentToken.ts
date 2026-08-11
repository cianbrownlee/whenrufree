function storageKey(slug: string): string {
  return `whenrufree:${slug}`;
}

export function getStoredToken(slug: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(storageKey(slug));
}

export function setStoredToken(slug: string, token: string): void {
  window.localStorage.setItem(storageKey(slug), token);
}

export function clearStoredToken(slug: string): void {
  window.localStorage.removeItem(storageKey(slug));
}
