import { NextResponse } from 'next/server';
import { smartShoppingList } from '@/app/api/ai-assistant/functions/reports';

export async function GET() {
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
