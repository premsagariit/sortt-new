export function resolveProfilePhotosBucket(): string {
  return process.env.R2_PROFILES_BUCKET_NAME || process.env.R2_BUCKET_NAME || 'sortt-profiles';
}
