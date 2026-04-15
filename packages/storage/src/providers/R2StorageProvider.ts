import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { IStorageProvider } from '../types';

export class R2StorageProvider implements IStorageProvider {
  private client: S3Client;
  private bucketName: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;

    if (!accountId) {
      throw new Error('R2_ACCOUNT_ID environment variable is required');
    }
    if (!accessKeyId) {
      throw new Error('R2_ACCESS_KEY_ID environment variable is required');
    }
    if (!secretAccessKey) {
      throw new Error('R2_SECRET_ACCESS_KEY environment variable is required');
    }
    if (!bucketName) {
      throw new Error('R2_BUCKET_NAME environment variable is required');
    }

    this.bucketName = bucketName;
    this.client = new S3Client({
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      region: 'auto',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async upload(bucket: string, path: string, data: Buffer): Promise<{ fileKey: string }> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket || this.bucketName,
        Key: path,
        Body: data,
      })
    );

    return { fileKey: path };
  }

  async getSignedUrl(fileKey: string, expiresInSeconds?: number, bucket?: string): Promise<string> {
    const expiresIn = Math.min(expiresInSeconds ?? 300, 300);
    const command = new GetObjectCommand({
      Bucket: bucket || this.bucketName,
      Key: fileKey,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  async delete(fileKey: string, bucket?: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: bucket || this.bucketName,
        Key: fileKey,
      })
    );
  }
}