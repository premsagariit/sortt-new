import type { IStorageProvider } from './types';
import { R2StorageProvider } from './providers/R2StorageProvider';
import { S3StorageProvider } from './providers/S3StorageProvider';

export { IStorageProvider } from './types';
export { R2StorageProvider } from './providers/R2StorageProvider';
export { S3StorageProvider } from './providers/S3StorageProvider';

/**
 * Factory function to create storage provider based on environment variable.
 */
export function createStorageProvider(): IStorageProvider {
  const provider = process.env.STORAGE_PROVIDER ?? 'r2';
  if (provider === 's3') {
    return new S3StorageProvider();
  }
  return new R2StorageProvider();
}
