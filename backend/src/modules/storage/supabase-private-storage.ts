import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError, BadRequestError } from '../../shared/errors/app-error.js';
import { sanitizeStorageKey } from './file-validation.js';
import type { StorageProvider } from './storage-provider.js';

function storageError(): AppError {
  return new AppError('Không thể thao tác file riêng tư', 502, 'STORAGE_PROVIDER_ERROR');
}

export class SupabasePrivateStorage implements StorageProvider {
  private readonly bucket: ReturnType<SupabaseClient['storage']['from']>;

  constructor(client: SupabaseClient, bucketName: string) {
    this.bucket = client.storage.from(bucketName);
  }

  private safeKey(key: string): string {
    const safeKey = sanitizeStorageKey(key);
    if (safeKey !== key) {
      throw new BadRequestError('Mã lưu trữ file không hợp lệ');
    }
    return safeKey;
  }

  async put(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    const safeKey = this.safeKey(key);
    const { error } = await this.bucket.upload(safeKey, buffer, {
      contentType: mimeType,
      upsert: false,
    });
    if (error) {
      throw storageError();
    }
  }

  async open(key: string): Promise<Buffer> {
    const safeKey = this.safeKey(key);
    const { data, error } = await this.bucket.download(safeKey);
    if (error || !data) {
      throw storageError();
    }
    return Buffer.from(await data.arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    const safeKey = this.safeKey(key);
    const { error } = await this.bucket.remove([safeKey]);
    if (error) {
      throw storageError();
    }
  }

  async exists(key: string): Promise<boolean> {
    const safeKey = this.safeKey(key);
    const { data, error } = await this.bucket.list('', {
      limit: 100,
      search: safeKey,
    });
    if (error) {
      throw storageError();
    }
    return data.some((item) => item.name === safeKey);
  }
}
