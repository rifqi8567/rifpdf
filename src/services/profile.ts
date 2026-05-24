import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';
import { debugAction, debugError } from '@/lib/debug';

type ProfileRow = {
  full_name: string | null;
  avatar_url: string | null;
  plan: User['plan'] | null;
  credits_remaining: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export async function getUserProfile(sessionUser: SupabaseUser): Promise<User> {
  debugAction('profile', 'get profile start', { userId: sessionUser.id });
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, plan, credits_remaining, created_at, updated_at')
    .eq('id', sessionUser.id)
    .maybeSingle<ProfileRow>();

  const metadata = sessionUser.user_metadata ?? {};
  const createdAt = profile?.created_at || sessionUser.created_at;

  const result = {
    id: sessionUser.id,
    email: sessionUser.email || '',
    full_name: profile?.full_name || metadata.full_name || 'User',
    avatar_url: profile?.avatar_url || metadata.avatar_url || '',
    plan: profile?.plan || 'free',
    credits_remaining: profile?.credits_remaining ?? 10,
    created_at: createdAt,
    updated_at: profile?.updated_at || sessionUser.updated_at || createdAt,
  };

  debugAction('profile', 'get profile success', {
    userId: result.id,
    source: profile ? 'profiles' : 'auth_metadata',
    hasAvatar: Boolean(result.avatar_url),
  });

  return result;
}

export async function updateUserProfile(userId: string, fullName: string, avatarUrl: string) {
  debugAction('profile', 'update profile start', {
    userId,
    fullName,
    hasAvatar: Boolean(avatarUrl),
  });

  const { error: authError } = await supabase.auth.updateUser({
    data: {
      full_name: fullName,
      avatar_url: avatarUrl,
    },
  });

  if (authError) {
    debugError('profile', 'update auth metadata failed', authError, { userId });
    throw authError;
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (profileError) {
    debugError('profile', 'update profile row failed', profileError, { userId });
    throw profileError;
  }

  debugAction('profile', 'update profile success', {
    userId,
    hasAvatar: Boolean(avatarUrl),
  });
}
