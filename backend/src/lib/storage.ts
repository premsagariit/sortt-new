import { createStorageProvider, type IStorageProvider as IProviderStorage } from '@sortt/storage';

export interface IStorageProvider {
    uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string>;
}

export class ProviderStorageAdapter implements IStorageProvider {
    private provider: IProviderStorage;

    constructor() {
        this.provider = createStorageProvider();
    }

    async uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
        const safeMime = mimeType.replace('/', '-');
        const path = `${safeMime}-${Date.now()}-${fileName}`;
        const uploaded = await this.provider.upload('kyc-media', path, fileBuffer);
        return uploaded.fileKey;
    }
}

export const storageProvider: IStorageProvider = new ProviderStorageAdapter();
