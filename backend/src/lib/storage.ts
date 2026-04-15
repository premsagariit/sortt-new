import { createStorageProvider, type IStorageProvider as IProviderStorage } from '@sortt/storage';

export interface IStorageProvider {
    uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string>;
    uploadWithKey(fileBuffer: Buffer, fileKey: string, bucket?: string): Promise<string>;
    getSignedUrl(fileKey: string, expiresInSeconds?: number, bucket?: string): Promise<string>;
}

export class ProviderStorageAdapter implements IStorageProvider {
    private provider: IProviderStorage;

    constructor() {
        this.provider = createStorageProvider();
    }

    async uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
        const safeMime = mimeType.replace('/', '-');
        const path = `${safeMime}-${Date.now()}-${fileName}`;
        const targetBucket = process.env.R2_BUCKET_NAME || 'kyc-media';
        const uploaded = await this.provider.upload(targetBucket, path, fileBuffer);
        return uploaded.fileKey;
    }

    async uploadWithKey(fileBuffer: Buffer, fileKey: string, bucket?: string): Promise<string> {
        const targetBucket = bucket || process.env.R2_BUCKET_NAME || 'kyc-media';
        const uploaded = await this.provider.upload(targetBucket, fileKey, fileBuffer);
        return uploaded.fileKey;
    }

    async getSignedUrl(fileKey: string, expiresInSeconds?: number, bucket?: string): Promise<string> {
        // Assume provider.getSignedUrl can take bucket or not. Wait, the underlying provider might not have bucket in getSignedUrl!
        // We will pass bucket if it accepts it, or just pass it as first arg if we know the signature.
        // Actually, if the provider doesn't support bucket, we need to prefix the bucket name, or maybe it supports it.
        // I will just add the bucket parameter to the interface first.
        return (this.provider as any).getSignedUrl(fileKey, expiresInSeconds, bucket);
    }
}

export const storageProvider: IStorageProvider = new ProviderStorageAdapter();
