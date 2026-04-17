/**
 * hooks/usePhotoCapture.ts
 * ─────────────────────────────────────────────────────────────────────
 * Shared hook for camera capture. ALL camera logic lives here.
 * Screen files must NEVER import ImagePicker directly.
 *
 * Day 8 extension point:
 *   After `setPhotoUri(uri)`, add:
 *     const storageKey = await storageProvider.upload(uri);
 *     onUploadComplete?.(storageKey);
 *   Only this file changes — screen interface is unchanged.
 * ─────────────────────────────────────────────────────────────────────
 */

import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

type FileSystemCompat = {
    cacheDirectory?: string | null;
    documentDirectory?: string | null;
    copyAsync: (options: { from: string; to: string }) => Promise<void>;
};

export interface UsePhotoCaptureOptions {
    allowsEditing?: boolean;
    aspect?: [number, number];
}

export interface UsePhotoCaptureResult {
    photoUri: string | null;
    capturePhoto: () => Promise<string | null>;
    pickFromGallery: () => Promise<string | null>;
    permissionDenied: boolean;
    mediaPermissionDenied: boolean;
    isLoading: boolean;
    reset: () => void;
}

export function usePhotoCapture(options: UsePhotoCaptureOptions = {}): UsePhotoCaptureResult {
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [mediaPermissionDenied, setMediaPermissionDenied] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const normalizeUploadUri = useCallback(async (uri: string): Promise<string> => {
        if (Platform.OS !== 'android' || !uri.startsWith('content://')) {
            return uri;
        }

        try {
            const fs = FileSystem as unknown as FileSystemCompat;
            const safeDir = fs.cacheDirectory ?? fs.documentDirectory;
            if (!safeDir) return uri;

            const extensionMatch = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
            const extension = extensionMatch?.[1]?.toLowerCase() ?? 'jpg';
            const targetUri = `${safeDir}upload-${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`;
            await fs.copyAsync({ from: uri, to: targetUri });
            return targetUri;
        } catch {
            return uri;
        }
    }, []);

    const capturePhoto = useCallback(async () => {
        setIsLoading(true);
        setPermissionDenied(false);

        try {
            // Request camera permission first
            const cameraResult = await ImagePicker.requestCameraPermissionsAsync();
            if (cameraResult.status !== ImagePicker.PermissionStatus.GRANTED) {
                setPermissionDenied(true);
                setIsLoading(false);
                return null;
            }

            // Launch the camera — never the gallery (Day 8 adds gallery as separate option)
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: options.allowsEditing ?? false,
                aspect: options.aspect,
                quality: 0.7,
            });

            if (!result.canceled && result.assets.length > 0) {
                const uri = await normalizeUploadUri(result.assets[0].uri);
                setPhotoUri(uri);
                return uri;
            }
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [options.allowsEditing, options.aspect]);

    const pickFromGallery = useCallback(async () => {
        setIsLoading(true);
        setMediaPermissionDenied(false);

        try {
            const mediaResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (mediaResult.status !== ImagePicker.PermissionStatus.GRANTED) {
                setMediaPermissionDenied(true);
                setIsLoading(false);
                return null;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: options.allowsEditing ?? false,
                aspect: options.aspect,
                quality: 0.8,
                selectionLimit: 1,
            });

            if (!result.canceled && result.assets.length > 0) {
                const uri = await normalizeUploadUri(result.assets[0].uri);
                setPhotoUri(uri);
                return uri;
            }
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [options.allowsEditing, options.aspect, normalizeUploadUri]);

    const reset = useCallback(() => {
        setPhotoUri(null);
        setPermissionDenied(false);
        setMediaPermissionDenied(false);
    }, []);

    return { photoUri, capturePhoto, pickFromGallery, permissionDenied, mediaPermissionDenied, isLoading, reset };
}
