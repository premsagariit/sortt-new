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

export interface UsePhotoCaptureOptions {
    allowsEditing?: boolean;
    aspect?: [number, number];
}

export interface UsePhotoCaptureResult {
    photoUri: string | null;
    capturePhoto: () => Promise<string | null>;
    permissionDenied: boolean;
    isLoading: boolean;
    reset: () => void;
}

export function usePhotoCapture(options: UsePhotoCaptureOptions = {}): UsePhotoCaptureResult {
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

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
                const uri = result.assets[0].uri;
                // Store only the local URI — no upload, no EXIF processing (V18: Day 8)
                setPhotoUri(uri);
                return uri;
            }
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [options.allowsEditing, options.aspect]);

    const reset = useCallback(() => {
        setPhotoUri(null);
        setPermissionDenied(false);
    }, []);

    return { photoUri, capturePhoto, permissionDenied, isLoading, reset };
}
