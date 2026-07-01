import dns from "dns/promises";

function isPrivateIp(host: string): boolean {
  if (host === "localhost" || host === "::1") return true;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // AWS/GCP metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 198 && (b === 18 || b === 19)) return true;
  }

  const blocked = ["metadata.google.internal", "instance-data", "metadata"];
  if (blocked.includes(host.toLowerCase())) return true;

  return false;
}

export async function isSafeExternalUrl(rawUrl: string): Promise<{ safe: boolean; reason?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { safe: false, reason: "Malformed URL" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { safe: false, reason: "Only http/https URLs are allowed" };
  }

  const hostname = parsed.hostname;
  if (isPrivateIp(hostname)) {
    return { safe: false, reason: "Private/internal URLs are not allowed" };
  }

  // Resolve DNS and check resolved IPs too (guards against DNS rebinding)
  try {
    const addrs = await dns.lookup(hostname, { all: true });
    for (const { address } of addrs) {
      if (isPrivateIp(address)) {
        return { safe: false, reason: "URL resolves to a private/internal address" };
      }
    }
  } catch {
    return { safe: false, reason: "Could not resolve hostname" };
  }

  return { safe: true };
}
