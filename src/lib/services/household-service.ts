/**
 * Household Service
 * API calls for household and user management
 */

import { supabase } from '../supabase/client';
import type { Household, User, HouseholdInvitation, PlanType, UserRole } from '../types/household';

// ============================================
// HOUSEHOLD OPERATIONS
// ============================================

/**
 * Get household by ID
 */
export async function getHousehold(householdId: string): Promise<Household | null> {
  const { data, error } = await supabase
    .from('households')
    .select('*')
    .eq('id', householdId)
    .single();

  if (error) {
    console.error('Error fetching household:', error);
    return null;
  }

  return data as Household;
}

/**
 * Get household by slug
 */
export async function getHouseholdBySlug(slug: string): Promise<Household | null> {
  const { data, error } = await supabase
    .from('households')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('Error fetching household by slug:', error);
    return null;
  }

  return data as Household;
}

/**
 * Create a new household
 */
export async function createHousehold(
  name: string,
  ownerEmail: string,
  ownerName: string,
  plan: PlanType = 'free'
): Promise<{ household: Household; user: User } | null> {
  // Generate slug from name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    + '-' + Date.now().toString(36);

  // Create household
  const { data: household, error: householdError } = await supabase
    .from('households')
    .insert({
      name,
      slug,
      owner_name: ownerName,
      plan,
      setup_completed: false,
    })
    .select()
    .single();

  if (householdError) {
    console.error('Error creating household:', householdError);
    return null;
  }

  // Create owner user
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      household_id: household.id,
      email: ownerEmail,
      name: ownerName,
      role: 'owner',
    })
    .select()
    .single();

  if (userError) {
    console.error('Error creating user:', userError);
    // Rollback household creation
    await supabase.from('households').delete().eq('id', household.id);
    return null;
  }

  return { household: household as Household, user: user as User };
}

/**
 * Update household settings
 */
export async function updateHousehold(
  householdId: string,
  updates: Partial<Household>
): Promise<Household | null> {
  const { data, error } = await supabase
    .from('households')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', householdId)
    .select()
    .single();

  if (error) {
    console.error('Error updating household:', error);
    return null;
  }

  return data as Household;
}

/**
 * Mark household setup as complete
 */
export async function completeHouseholdSetup(householdId: string): Promise<boolean> {
  const { error } = await supabase
    .from('households')
    .update({ setup_completed: true, updated_at: new Date().toISOString() })
    .eq('id', householdId);

  return !error;
}

// ============================================
// USER OPERATIONS
// ============================================

/**
 * Get user by auth ID
 */
export async function getUserByAuthId(authId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', authId)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return data as User;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user by email:', error);
  }

  return data as User | null;
}

/**
 * Get all users in a household
 */
export async function getHouseholdUsers(householdId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at');

  if (error) {
    console.error('Error fetching household users:', error);
    return [];
  }

  return data as User[];
}

/**
 * Create a new user (when accepting invitation)
 */
export async function createUser(
  householdId: string,
  email: string,
  name: string,
  role: UserRole = 'member',
  authId?: string
): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .insert({
      household_id: householdId,
      email,
      name,
      role,
      auth_id: authId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    return null;
  }

  return data as User;
}

/**
 * Update user
 */
export async function updateUser(
  userId: string,
  updates: Partial<User>
): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user:', error);
    return null;
  }

  return data as User;
}

/**
 * Link user to Supabase Auth
 */
export async function linkUserToAuth(userId: string, authId: string): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ auth_id: authId })
    .eq('id', userId);

  return !error;
}

/**
 * Update user last active timestamp
 */
export async function updateUserActivity(userId: string): Promise<void> {
  await supabase
    .from('users')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', userId);
}

/**
 * Remove user from household
 */
export async function removeUser(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  return !error;
}

// ============================================
// INVITATION OPERATIONS
// ============================================

/**
 * Create invitation
 */
export async function createInvitation(
  householdId: string,
  email: string,
  role: UserRole,
  invitedBy: string
): Promise<HouseholdInvitation | null> {
  // Generate secure token
  const token = crypto.randomUUID() + '-' + Date.now().toString(36);

  // Expire in 7 days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from('household_invitations')
    .insert({
      household_id: householdId,
      email,
      role,
      invited_by: invitedBy,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating invitation:', error);
    return null;
  }

  return data as HouseholdInvitation;
}

/**
 * Get invitation by token
 */
export async function getInvitationByToken(token: string): Promise<HouseholdInvitation | null> {
  const { data, error } = await supabase
    .from('household_invitations')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error) {
    console.error('Error fetching invitation:', error);
    return null;
  }

  return data as HouseholdInvitation;
}

/**
 * Accept invitation
 */
export async function acceptInvitation(
  token: string,
  name: string,
  authId?: string
): Promise<User | null> {
  const invitation = await getInvitationByToken(token);
  if (!invitation) {
    console.error('Invalid or expired invitation');
    return null;
  }

  // Create user
  const user = await createUser(
    invitation.household_id,
    invitation.email,
    name,
    invitation.role,
    authId
  );

  if (!user) return null;

  // Mark invitation as accepted
  await supabase
    .from('household_invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id);

  return user;
}

/**
 * Get pending invitations for a household
 */
export async function getHouseholdInvitations(householdId: string): Promise<HouseholdInvitation[]> {
  const { data, error } = await supabase
    .from('household_invitations')
    .select('*')
    .eq('household_id', householdId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invitations:', error);
    return [];
  }

  return data as HouseholdInvitation[];
}

/**
 * Cancel invitation
 */
export async function cancelInvitation(invitationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('household_invitations')
    .delete()
    .eq('id', invitationId);

  return !error;
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Create a default household for demo/first-time use
 */
async function createDefaultHousehold(): Promise<{ household: Household; user: User } | null> {
  console.log('[Household] Creating default household...');

  // Generate a unique slug
  const slug = 'familia-gonzalez-' + Date.now().toString(36);

  // Create the household
  const { data: household, error: householdError } = await supabase
    .from('households')
    .insert({
      name: 'Familia González',
      slug,
      owner_name: 'Familia González',
      plan: 'premium', // Give full access for demo
      setup_completed: true,
      features: {
        ai_assistant: true,
        meal_planning: true,
        shopping_list: true,
        home_management: true,
        employee_management: true,
        analytics: true,
      }
    })
    .select()
    .single();

  if (householdError) {
    console.error('[Household] Error creating default household:', householdError);
    return null;
  }

  console.log('[Household] Created household:', household.id);

  // Create the default owner user
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      household_id: household.id,
      email: 'familia@gonzalez.com',
      name: 'Familia González',
      role: 'owner',
    })
    .select()
    .single();

  if (userError) {
    console.error('[Household] Error creating default user:', userError);
    // Try to clean up the household
    await supabase.from('households').delete().eq('id', household.id);
    return null;
  }

  console.log('[Household] Created user:', user.id);

  // Also create the AI trust record for this household
  const { error: trustError } = await supabase
    .from('household_ai_trust')
    .insert({
      household_id: household.id,
      trust_level: 3, // Start at "Confiable" level
      auto_approve_level: 2, // Auto-approve low and medium risk
      max_actions_per_minute: 20,
      max_critical_actions_per_day: 10,
      max_items_per_bulk_operation: 50,
      allow_bulk_operations: true,
      allow_destructive_actions: false,
    });

  if (trustError) {
    console.warn('[Household] Could not create AI trust record:', trustError);
    // Not critical - continue anyway
  }

  return { household: household as Household, user: user as User };
}

/**
 * Initialize household context
 * Called on app load to set up the current household and user
 */
export async function initializeHouseholdContext(): Promise<{
  household: Household | null;
  user: User | null;
}> {
  console.log('[Household] Initializing context...');

  // For now, get the first/default household (no auth yet)
  // In Phase B, this will use Supabase Auth
  const { data: households, error: fetchError } = await supabase
    .from('households')
    .select('*')
    .limit(1);

  if (fetchError) {
    console.error('[Household] Error fetching households:', fetchError);
  }

  // If no households exist, create a default one
  if (!households || households.length === 0) {
    console.log('[Household] No households found, creating default...');
    const result = await createDefaultHousehold();
    if (result) {
      console.log('[Household] Default household created successfully');
      return result;
    }
    console.error('[Household] Failed to create default household');
    return { household: null, user: null };
  }

  const household = households[0] as Household;
  console.log('[Household] Found household:', household.id, household.name);

  // Get first user in household (temporary until auth)
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('household_id', household.id)
    .limit(1);

  const user = users?.[0] as User | null;
  console.log('[Household] Found user:', user?.id, user?.name);

  return { household, user };
}
