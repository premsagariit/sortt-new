export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  'accepted':            ['en_route'],
  'en_route':            ['weighing_in_progress'],
};

// These are ALWAYS hard-rejected regardless of current status (V13):
export const IMMUTABLE_STATUSES = ['completed', 'disputed'] as const;
