export async function parsePDF(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");

  // Use CDN worker to avoid Turbopack bundling issues
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(pageText);
  }

  return pages.join("\n\n").replace(/\s+/g, " ").trim();
}

export async function parseImageFile(file: File, apiKey?: string | null): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const dataUrl = e.target?.result as string;
        const base64 = dataUrl.split(",")[1];
        const mediaType = file.type as
          | "image/jpeg"
          | "image/png"
          | "image/gif"
          | "image/webp";

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (apiKey) headers["x-api-key"] = apiKey;

        const response = await fetch("/api/parse-image", {
          method: "POST",
          headers,
          body: JSON.stringify({ base64, mediaType }),
        });

        if (!response.ok) throw new Error("Image parsing failed");
        const { text } = await response.json();
        resolve(text);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function parseURL(url: string): Promise<string> {
  const response = await fetch("/api/extract-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "URL extraction failed");
  }
  const { text } = await response.json();
  return text;
}
