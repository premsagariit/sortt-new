import type { IStorageProvider } from './types';
import { UploadthingStorageProvider } from './providers/UploadthingStorageProvider';
import { StubStorageProvider } from './providers/StubStorageProvider';

export { IStorageProvider } from './types';
export { UploadthingStorageProvider } from './providers/UploadthingStorageProvider';
export { StubStorageProvider } from './providers/StubStorageProvider';

/**
 * Factory function to create storage provider based on environment variable.
 */
export function createStorageProvider(): IStorageProvider {
  const provider = process.env.STORAGE_PROVIDER || 'uploadthing';

  if (provider === 'uploadthing') {
    return new UploadthingStorageProvider();
  }

  if (provider === 'stub') {
    return new StubStorageProvider();
  }

  throw new Error(`Unknown storage provider: ${provider}`);
}
