import { createClient } from '@supabase/supabase-js';
import { env } from '../../config/env.js';
import { LocalPrivateStorage } from './local-private-storage.js';
import { SupabasePrivateStorage } from './supabase-private-storage.js';
import type { StorageProvider } from './storage-provider.js';

export function createStorageProvider(): StorageProvider {
  if (env.STORAGE_PROVIDER === 'supabase') {
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseSecretKey = env.SUPABASE_SECRET_KEY;
    if (!supabaseUrl || !supabaseSecretKey) {
      throw new Error('Supabase storage configuration is incomplete');
    }

    const client = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    return new SupabasePrivateStorage(client, env.SUPABASE_STORAGE_BUCKET);
  }

  return new LocalPrivateStorage(env.STORAGE_ROOT);
}

export const defaultStorageProvider = createStorageProvider();
