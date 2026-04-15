/**
 * IStorageProvider — Abstraction for file storage.
 * Critical (D1): No public URL method — all files private with signed URLs only.
 * Two implementations: R2StorageProvider (default), S3StorageProvider (stub).
 */

export interface IStorageProvider {
  /**
   * Upload a file to storage.
   * @param bucket - Logical bucket name (e.g., "kyc-media", "invoices", "scrap-photos")
   * @param path - File path within bucket
   * @param data - File buffer
   * @returns File key for later reference and deletion
   */
  upload(bucket: string, path: string, data: Buffer): Promise<{ fileKey: string }>;

  /**
   * Get a signed URL for a file.
   * D1: Signed URLs are the only way to access files (no public URLs).
   * @param fileKey - File key returned from upload()
   * @param expiresInSeconds - URL expiry in seconds. Defaults to 300 (5 minutes).
   * @returns Signed URL valid for specified duration
   */
  getSignedUrl(fileKey: string, expiresInSeconds?: number, bucket?: string): Promise<string>;

  /**
   * Delete a file from storage.
   * @param fileKey - File key to delete
   */
  delete(fileKey: string): Promise<void>;

  /**
   * CRITICAL (D1): No public URL method exists in this interface.
   * All files remain private. Use getSignedUrl() with expiry for access.
   */
}
