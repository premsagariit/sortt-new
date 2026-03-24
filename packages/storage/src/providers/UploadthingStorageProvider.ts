import { IStorageProvider } from '../types';

/**
 * Uploadthing implementation of IStorageProvider.
 * Handles file uploads, signed URL generation, and deletion.
 * D1: All files are private — no public URLs.
 */
export class UploadthingStorageProvider implements IStorageProvider {
  private token: string;
  // Note: Full Uploadthing SDK import happens here (not in app code)
  // Application code only imports IStorageProvider interface

  constructor() {
    const token = process.env.UPLOADTHING_TOKEN;
    if (!token) {
      throw new Error('UPLOADTHING_TOKEN environment variable is required');
    }
    this.token = token;
  }

  async upload(bucket: string, path: string, data: Buffer): Promise<{ fileKey: string }> {
    try {
      // In Day 15, this will call actual Uploadthing SDK
      // For now, return placeholder
      const fileKey = `${bucket}/${path}-${Date.now()}`;
      console.log('UploadthingStorageProvider.upload() called', { bucket, path, fileKey });
      return { fileKey };
    } catch (error) {
      console.error('UploadthingStorageProvider.upload() failed', { bucket, path, error });
      throw error;
    }
  }

  async getSignedUrl(fileKey: string, expiresInSeconds?: number): Promise<string> {
    try {
      // Default to 300 seconds (5 minutes) if not specified
      const expiry = expiresInSeconds ?? 300;

      // In Day 15, this will call actual Uploadthing SDK to get signed URL
      // For now, return placeholder
      const signedUrl = `https://uploadthing.com/f/${fileKey}?expires=${Date.now() + expiry * 1000}`;
      console.log('UploadthingStorageProvider.getSignedUrl() called', { fileKey, expiry });
      return signedUrl;
    } catch (error) {
      console.error('UploadthingStorageProvider.getSignedUrl() failed', { fileKey, error });
      throw error;
    }
  }

  async delete(fileKey: string): Promise<void> {
    try {
      // In Day 15, this will call actual Uploadthing SDK
      console.log('UploadthingStorageProvider.delete() called', { fileKey });
    } catch (error) {
      console.error('UploadthingStorageProvider.delete() failed', { fileKey, error });
      throw error;
    }
  }
}
