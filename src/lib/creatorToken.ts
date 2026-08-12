function storageKey(slug: string): string {
  return `whenrufree:creator:${slug}`;
}

export function getStoredCreatorToken(slug: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(storageKey(slug));
}

export function setStoredCreatorToken(slug: string, token: string): void {
  window.localStorage.setItem(storageKey(slug), token);
}

export function clearStoredCreatorToken(slug: string): void {
  window.localStorage.removeItem(storageKey(slug));
}
