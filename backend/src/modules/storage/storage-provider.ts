export interface StorageProvider {
  put(key: string, buffer: Buffer, mimeType: string): Promise<void>;
  open(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
