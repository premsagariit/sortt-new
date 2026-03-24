import type { IStorageProvider } from '../types';

export class S3StorageProvider implements IStorageProvider {
  async upload(_bucket: string, _path: string, _data: Buffer): Promise<{ fileKey: string }> {
    throw new Error('S3StorageProvider: not yet implemented — set STORAGE_PROVIDER=r2');
  }

  async getSignedUrl(_fileKey: string, _expiresInSeconds?: number): Promise<string> {
    throw new Error('S3StorageProvider: not yet implemented — set STORAGE_PROVIDER=r2');
  }

  async delete(_fileKey: string): Promise<void> {
    throw new Error('S3StorageProvider: not yet implemented — set STORAGE_PROVIDER=r2');
  }
}