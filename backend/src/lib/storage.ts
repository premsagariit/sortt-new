import { UTApi } from 'uploadthing/server';
import fs from 'fs';
import path from 'path';

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

export class LocalStorageProvider implements IStorageProvider {
    private uploadDir: string;

    constructor() {
        this.uploadDir = path.resolve(process.cwd(), 'uploads/kyc');
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
        const timestamp = Date.now();
        const safeFileName = `${timestamp}-${fileName}`;
        const filePath = path.join(this.uploadDir, safeFileName);
        
        fs.writeFileSync(filePath, fileBuffer);
        
        console.log(`[DIAG] File saved locally to: ${filePath}`);
        // Return a local URL or relative path
        return `/uploads/kyc/${safeFileName}`;
    }
}

// Fallback to local storage if token is missing
export const storageProvider: IStorageProvider = process.env.UPLOADTHING_TOKEN && !process.env.UPLOADTHING_TOKEN.startsWith('sk_live_xxxx')
    ? new UploadthingStorageProvider()
    : new LocalStorageProvider();
