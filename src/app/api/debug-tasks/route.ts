'use server';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const householdId = searchParams.get('householdId') || 'b3ccbf7e-f3a6-4db0-a97f-0b429aa1efd7';
  const startDate = searchParams.get('startDate') || '2026-01-18';
  const endDate = searchParams.get('endDate') || '2026-01-24';

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Query simple
  const { data: simpleData, error: simpleError, count } = await supabase
    .from('scheduled_tasks')
    .select('*', { count: 'exact' })
    .eq('household_id', householdId)
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate);

  // Query con JOINs
  const { data: fullData, error: fullError } = await supabase
    .from('scheduled_tasks')
    .select(`
      *,
      task_template:task_templates(*),
      space:spaces(*, space_type:space_types(*)),
      employee:home_employees(*)
    `)
    .eq('household_id', householdId)
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .order('scheduled_date');

  return NextResponse.json({
    params: { householdId, startDate, endDate },
    simpleQuery: {
      count,
      dataLength: simpleData?.length,
      error: simpleError,
      sampleIds: simpleData?.slice(0, 3).map(t => t.id)
    },
    fullQuery: {
      dataLength: fullData?.length,
      error: fullError,
      sampleData: fullData?.slice(0, 2)
    }
  });
}
