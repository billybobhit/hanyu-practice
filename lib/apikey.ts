const KEY = "hanyu_gemini_key";

export function getApiKey(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setApiKey(key: string): void {
  localStorage.setItem(KEY, key);
}

export function clearApiKey(): void {
  localStorage.removeItem(KEY);
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}
