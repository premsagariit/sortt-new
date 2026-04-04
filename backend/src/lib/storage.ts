import { createStorageProvider, type IStorageProvider as IProviderStorage } from '@sortt/storage';

export interface IStorageProvider {
    uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string>;
    uploadWithKey(fileBuffer: Buffer, fileKey: string, bucket?: string): Promise<string>;
    getSignedUrl(fileKey: string, expiresInSeconds?: number): Promise<string>;
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

    async getSignedUrl(fileKey: string, expiresInSeconds?: number): Promise<string> {
        return this.provider.getSignedUrl(fileKey, expiresInSeconds);
    }
}

export const storageProvider: IStorageProvider = new ProviderStorageAdapter();
