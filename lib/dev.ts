export const DEV_EMAILS = ["billybobhit.777@gmail.com"];

export function isDev(email: string | undefined | null): boolean {
  return !!email && DEV_EMAILS.includes(email.toLowerCase());
}

export const DEV_MODE_KEY = "hanyu_dev_mode";
export const DEV_MODE_EVENT = "hanyu_dev_mode_change";

export function getDevMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEV_MODE_KEY) === "true";
}

export function setDevMode(enabled: boolean): void {
  localStorage.setItem(DEV_MODE_KEY, enabled ? "true" : "false");
  window.dispatchEvent(new Event(DEV_MODE_EVENT));
}
