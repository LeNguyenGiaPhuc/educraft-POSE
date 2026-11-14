import fs from 'node:fs/promises';
import path from 'node:path';
import type { StorageProvider } from './storage-provider.js';
import { sanitizeStorageKey } from './file-validation.js';
import { BadRequestError } from '../../shared/errors/app-error.js';

export class LocalPrivateStorage implements StorageProvider {
  private readonly rootDir: string;

  constructor(rootDir?: string) {
    this.rootDir = path.resolve(
      rootDir || process.env.STORAGE_ROOT || path.join(process.cwd(), 'storage_private')
    );
  }

  private resolveSafePath(key: string): string {
    const safeKey = sanitizeStorageKey(key);
    const resolved = path.resolve(this.rootDir, safeKey);

    // Verify resolved path is strictly inside rootDir
    if (!resolved.startsWith(this.rootDir)) {
      throw new BadRequestError('Đường dẫn file nằm ngoài thư mục lưu trữ cho phép');
    }

    return resolved;
  }

  async put(key: string, buffer: Buffer, _mimeType: string): Promise<void> {
    const filePath = this.resolveSafePath(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
  }

  async open(key: string): Promise<Buffer> {
    const filePath = this.resolveSafePath(key);
    return fs.readFile(filePath);
  }

  async delete(key: string): Promise<void> {
    try {
      const filePath = this.resolveSafePath(key);
      await fs.unlink(filePath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
        throw err;
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const filePath = this.resolveSafePath(key);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

export const defaultStorageProvider = new LocalPrivateStorage();
