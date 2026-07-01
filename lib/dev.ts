function getDevEmails(): string[] {
  const envVal = process.env.DEV_EMAILS;
  if (envVal) return envVal.split(",").map((e) => e.trim().toLowerCase());
  return ["billybobhit.777@gmail.com"]; // fallback if env var not set
}

export function isDev(email: string | undefined | null): boolean {
  return !!email && getDevEmails().includes(email.toLowerCase());
}

export const DEV_MODE_KEY = "hanyu_dev_mode";
export const DEV_MODE_EVENT = "hanyu_dev_mode_change";
export const DEV_MODE_DISABLED_KEY = "hanyu_dev_mode_disabled";
export const DEV_USER_KEY = "hanyu_is_dev_user";

export function getPersistedDevUser(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEV_USER_KEY) === "true";
}

export function setPersistedDevUser(value: boolean): void {
  if (value) localStorage.setItem(DEV_USER_KEY, "true");
  else localStorage.removeItem(DEV_USER_KEY);
}

export function getDevMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEV_MODE_KEY) === "true";
}

export function setDevMode(enabled: boolean): void {
  localStorage.setItem(DEV_MODE_KEY, enabled ? "true" : "false");
  window.dispatchEvent(new Event(DEV_MODE_EVENT));
}

export function isDevModeManuallyOff(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEV_MODE_DISABLED_KEY) === "true";
}

export function setDevModeManuallyOff(off: boolean): void {
  if (off) localStorage.setItem(DEV_MODE_DISABLED_KEY, "true");
  else localStorage.removeItem(DEV_MODE_DISABLED_KEY);
}
