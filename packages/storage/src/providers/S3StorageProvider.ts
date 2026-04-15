import type { IStorageProvider } from '../types';

export class S3StorageProvider implements IStorageProvider {
  async upload(_bucket: string, _path: string, _data: Buffer): Promise<{ fileKey: string }> {
    throw new Error('S3StorageProvider: not yet implemented — set STORAGE_PROVIDER=r2');
  }

  async getSignedUrl(fileKey: string, expiresInSeconds?: number, bucket?: string): Promise<string> {
    throw new Error('Method not implemented.');
  }

  async delete(fileKey: string, bucket?: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}