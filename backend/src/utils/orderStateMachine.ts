export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  'created':              ['accepted'],
  'accepted':             ['en_route', 'cancelled'],
  'en_route':             ['arrived', 'cancelled'],
  'arrived':              ['weighing_in_progress', 'cancelled'],
  'weighing_in_progress': ['completed', 'cancelled'],
};

// These are ALWAYS hard-rejected regardless of current status (V13):
export const IMMUTABLE_STATUSES = ['completed', 'disputed'] as const;
