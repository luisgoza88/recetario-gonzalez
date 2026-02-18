import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { smartShoppingList } from '@/app/api/ai-assistant/functions/reports';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await smartShoppingList(7);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating smart shopping list:', error);
    return NextResponse.json(
      { error: 'Error generando lista de compras' },
      { status: 500 }
    );
  }
}
