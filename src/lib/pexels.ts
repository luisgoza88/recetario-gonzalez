const PEXELS_API_URL = "https://api.pexels.com/v1/search";

export interface PexelsPhoto {
  id: number;
  url: string; // page url
  src: { medium: string; large: string; original: string };
  photographer: string;
  photographer_url: string;
  alt: string;
}

export async function searchPexels(
  query: string,
  options?: {
    perPage?: number;
    orientation?: "landscape" | "square" | "portrait";
  },
): Promise<PexelsPhoto[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.warn("[pexels] PEXELS_API_KEY not set, skipping Pexels search");
    return [];
  }

  const params = new URLSearchParams({
    query,
    per_page: String(options?.perPage ?? 5),
    orientation: options?.orientation ?? "landscape",
  });

  try {
    const res = await fetch(`${PEXELS_API_URL}?${params}`, {
      headers: { Authorization: apiKey },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("[pexels] API error:", res.status);
      return [];
    }

    const data = await res.json();
    return data.photos ?? [];
  } catch (err) {
    console.error("[pexels] fetch error:", err);
    return [];
  }
}

// Score basico: si la primera foto tiene "food", "dish", "meal" en alt, es buen match
export function scorePexelsMatch(
  photo: PexelsPhoto,
  recipeName: string,
): number {
  const alt = (photo.alt || "").toLowerCase();
  const name = recipeName.toLowerCase();

  let score = 0;
  if (
    alt.includes("food") ||
    alt.includes("dish") ||
    alt.includes("meal") ||
    alt.includes("plate")
  ) {
    score += 30;
  }

  const nameWords = name.split(/\s+/).filter((w) => w.length > 3);
  for (const word of nameWords) {
    if (alt.includes(word)) score += 20;
  }

  return score;
}
