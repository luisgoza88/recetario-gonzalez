import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/server';

/**
 * Extract authenticated user from the middleware-set header.
 * Returns null if no user is authenticated.
 */
export function getAuthenticatedUser(request: NextRequest): { userId: string } | null {
  const userId = request.headers.get('x-user-id');
  if (!userId) return null;
  return { userId };
}

/**
 * Guard that returns a 401 response if the user is not authenticated.
 * Use at the top of API route handlers.
 */
export function requireAuth(request: NextRequest): { userId: string } | NextResponse {
  const user = getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }
  return user;
}

/**
 * Check if the authenticated user has a specific permission in a household.
 * Uses the check_user_permission RPC defined in the multi-tenant migration.
 */
export async function requirePermission(
  householdId: string,
  permission: string
): Promise<boolean> {
  const supabase = await createAuthenticatedClient();
  const { data, error } = await supabase.rpc('check_user_permission', {
    p_household_id: householdId,
    p_permission: permission,
  });
  if (error) return false;
  return !!data;
}

/**
 * Helper to return a 403 Forbidden response.
 */
export function forbiddenResponse(message = 'Insufficient permissions') {
  return NextResponse.json(
    { error: message, code: 'FORBIDDEN' },
    { status: 403 }
  );
}
