interface OpenAIImageResult {
  imageData: string;
  mimeType: "image/jpeg";
  model: string;
}

/**
 * Genera una imagen mediante Image API cuando OPENAI_API_KEY está configurada.
 * Retorna null para que el endpoint continúe con sus proveedores de respaldo.
 */
export async function generateRecipeImageWithOpenAI(
  prompt: string,
): Promise<OpenAIImageResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size: "1536x1024",
      quality: process.env.OPENAI_IMAGE_QUALITY || "medium",
      output_format: "jpeg",
      output_compression: 88,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const requestId = response.headers.get("x-request-id");
    throw new Error(
      `OpenAI image generation failed (${response.status})${requestId ? ` request ${requestId}` : ""}`,
    );
  }

  const data = (await response.json()) as {
    data?: Array<{ b64_json?: string }>;
  };
  const imageData = data.data?.[0]?.b64_json;
  if (!imageData) throw new Error("OpenAI image response did not include image data");

  return { imageData, mimeType: "image/jpeg", model };
}
