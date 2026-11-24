import { describe, expect, it, vi } from 'vitest';
import { SupabasePrivateStorage } from '../../../../../backend/src/modules/storage/supabase-private-storage.js';

describe('SupabasePrivateStorage', () => {
  it('uses private bucket upload, download, remove, and exact-key lookup', async () => {
    const download = vi.fn().mockResolvedValue({
      data: new Blob([Buffer.from('private-file')]),
      error: null,
    });
    const upload = vi.fn().mockResolvedValue({ data: { path: 'abc.pdf' }, error: null });
    const remove = vi.fn().mockResolvedValue({ data: [{ name: 'abc.pdf' }], error: null });
    const list = vi.fn().mockResolvedValue({ data: [{ name: 'abc.pdf' }], error: null });
    const from = vi.fn().mockReturnValue({ upload, download, remove, list });
    const storage = new SupabasePrivateStorage({ storage: { from } } as any, 'educraft-private');

    await storage.put('abc.pdf', Buffer.from('private-file'), 'application/pdf');
    expect(from).toHaveBeenCalledWith('educraft-private');
    expect(upload).toHaveBeenCalledWith('abc.pdf', expect.any(Buffer), {
      contentType: 'application/pdf',
      upsert: false,
    });

    const opened = await storage.open('abc.pdf');
    expect(opened.toString()).toBe('private-file');
    expect(download).toHaveBeenCalledWith('abc.pdf');

    expect(await storage.exists('abc.pdf')).toBe(true);
    expect(list).toHaveBeenCalledWith('', { limit: 100, search: 'abc.pdf' });

    await storage.delete('abc.pdf');
    expect(remove).toHaveBeenCalledWith(['abc.pdf']);
  });
});
