import { IStorageProvider } from '../types';

/**
 * Stub storage provider for testing without Uploadthing.
 * All methods throw NotImplementedError.
 */
export class StubStorageProvider implements IStorageProvider {
  async upload(_bucket: string, _path: string, _data: Buffer): Promise<{ fileKey: string }> {
    throw new NotImplementedError('StubStorageProvider.upload() not yet implemented');
  }

  async getSignedUrl(_fileKey: string, _expiresInSeconds?: number): Promise<string> {
    throw new NotImplementedError('StubStorageProvider.getSignedUrl() not yet implemented');
  }

  async delete(_fileKey: string): Promise<void> {
    throw new NotImplementedError('StubStorageProvider.delete() not yet implemented');
  }
}

/**
 * Custom error for unimplemented methods.
 */
class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}
