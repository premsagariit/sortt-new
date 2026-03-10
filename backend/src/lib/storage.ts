import { UTApi } from 'uploadthing/server';

export interface IStorageProvider {
    uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string>;
}

export class UploadthingStorageProvider implements IStorageProvider {
    private utapi: UTApi;

    constructor() {
        this.utapi = new UTApi({ token: process.env.UPLOADTHING_TOKEN });
    }

    async uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
        const file = new File([fileBuffer], fileName, { type: mimeType });
        const response = await this.utapi.uploadFiles([file]);

        if (!response || response.length === 0 || !!response[0].error) {
            throw new Error(`Upload failed: ${response[0]?.error?.message || 'Unknown error'}`);
        }

        // Return the generated key
        return response[0].data.key;
    }
}

export const storageProvider = new UploadthingStorageProvider();
