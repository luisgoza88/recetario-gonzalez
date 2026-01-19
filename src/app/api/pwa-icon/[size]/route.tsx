import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Tamaños válidos para iconos PWA
const VALID_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: sizeParam } = await params;
  const size = parseInt(sizeParam, 10);

  // Validar tamaño
  if (!VALID_SIZES.includes(size)) {
    return new Response(`Invalid size. Valid sizes: ${VALID_SIZES.join(', ')}`, {
      status: 400,
    });
  }

  // Calcular tamaños proporcionales
  const borderRadius = Math.round(size * 0.2); // 20% del tamaño
  const fontSize = Math.round(size * 0.6); // 60% del tamaño

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#2E7D32',
          borderRadius: borderRadius,
          fontSize: fontSize,
        }}
      >
        🍽️
      </div>
    ),
    {
      width: size,
      height: size,
    }
  );
}
