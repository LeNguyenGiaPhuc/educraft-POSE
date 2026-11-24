import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { LocalPrivateStorage } from '../../../../../backend/src/modules/storage/local-private-storage.js';

describe('LocalPrivateStorage', () => {
  let tempDir: string;
  let storage: LocalPrivateStorage;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'educraft-storage-test-'));
    storage = new LocalPrivateStorage(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('puts and opens a file safely', async () => {
    const key = 'test-file.pdf';
    const content = Buffer.from('%PDF-1.4 test data');

    await storage.put(key, content, 'application/pdf');
    expect(await storage.exists(key)).toBe(true);

    const retrieved = await storage.open(key);
    expect(retrieved.equals(content)).toBe(true);
  });

  it('rejects path traversal on put and open', async () => {
    const maliciousKey = '../../evil.txt';
    const content = Buffer.from('evil');

    await expect(storage.put(maliciousKey, content, 'text/plain')).rejects.toThrow();
    await expect(storage.open(maliciousKey)).rejects.toThrow();
  });

  it('deletes an existing file cleanly and ignores missing on delete', async () => {
    const key = 'delete-me.pdf';
    await storage.put(key, Buffer.from('data'), 'application/pdf');
    expect(await storage.exists(key)).toBe(true);

    await storage.delete(key);
    expect(await storage.exists(key)).toBe(false);

    // Deleting again should not throw
    await expect(storage.delete(key)).resolves.not.toThrow();
  });
});
