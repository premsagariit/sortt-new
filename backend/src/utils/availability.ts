type DaySchedule = {
  day: string;
  isOpen: boolean;
  start: string;
  end: string;
};

const SLOT_TO_RANGE: Record<string, { start: number; end: number }> = {
  morning_8_10: { start: 8 * 60, end: 10 * 60 },
  morning_10_12: { start: 10 * 60, end: 12 * 60 },
  afternoon_12_2: { start: 12 * 60, end: 14 * 60 },
  afternoon_2_4: { start: 14 * 60, end: 16 * 60 },
  afternoon_4_6: { start: 16 * 60, end: 18 * 60 },
  evening_6_plus: { start: 18 * 60, end: 24 * 60 - 1 },
};

const TYPE_TO_RANGE: Record<string, { start: number; end: number }> = {
  morning: { start: 8 * 60, end: 12 * 60 },
  afternoon: { start: 12 * 60, end: 18 * 60 },
  evening: { start: 18 * 60, end: 24 * 60 - 1 },
};

const IST_TZ = 'Asia/Kolkata';

const NON_ALNUM_TO_SPACE = /[^a-z0-9]+/g;

const normalizeAddressText = (value: unknown): string => {
  return String(value ?? '')
    .toLowerCase()
    .replace(NON_ALNUM_TO_SPACE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const splitAddressParts = (value: unknown): string[] => {
  const raw = String(value ?? '').trim();
  if (!raw) return [];
  return raw
    .split(/[,;|\n]/)
    .map((part) => normalizeAddressText(part))
    .filter(Boolean);
};

const escapeRegex = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const hasWordBoundaryMatch = (haystack: string, area: string): boolean => {
  if (!haystack || !area) return false;
  const phrasePattern = escapeRegex(area).replace(/\s+/g, '\\s+');
  const pattern = new RegExp(`(?:^|\\b)${phrasePattern}(?:\\b|$)`);
  return pattern.test(haystack);
};

export function normalizeAreaValue(value: unknown): string {
  return normalizeAddressText(value);
}

export function parseOperatingAreas(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v ?? '').trim()).filter(Boolean);
  }

  if (typeof value !== 'string') return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v ?? '').trim()).filter(Boolean);
      }
    } catch {
      // Fall through to CSV parsing.
    }
  }

  return trimmed.split(/[,;|]/).map((v) => v.trim()).filter(Boolean);
}

export function isAddressInOperatingAreas(
  pickupLocality: unknown,
  pickupAddress: unknown,
  operatingAreas: string[]
): boolean {
  const normalizedAreas = Array.from(
    new Set(operatingAreas.map(normalizeAreaValue).filter(Boolean))
  );
  if (normalizedAreas.length === 0) return false;

  const localityNorm = normalizeAreaValue(pickupLocality);
  const addressNorm = normalizeAreaValue(pickupAddress);
  const addressParts = splitAddressParts(pickupAddress);

  const strictCandidates = [localityNorm, ...addressParts, addressNorm].filter(Boolean);

  for (const area of normalizedAreas) {
    const strictHit = strictCandidates.some((candidate) => (
      candidate === area || hasWordBoundaryMatch(candidate, area)
    ));

    if (strictHit) {
      return true;
    }
  }

  for (const area of normalizedAreas) {
    // Hybrid fallback: allow controlled substring matching only for meaningful area labels.
    if (area.length < 4) continue;
    if (localityNorm.includes(area)) return true;
    if (addressNorm.includes(area)) return true;
  }

  return false;
}

const parseTimeToMinutes = (time: string): number | null => {
  if (!time || typeof time !== 'string') return null;
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const marker = match[3].toUpperCase();

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  if (marker === 'PM' && hours < 12) hours += 12;
  if (marker === 'AM' && hours === 12) hours = 0;

  return (hours * 60) + minutes;
};

const getDayNameInIst = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: IST_TZ,
  }).format(date);
};

const getMinutesInIst = (date: Date): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: IST_TZ,
  }).formatToParts(date);

  const hourPart = parts.find((p) => p.type === 'hour')?.value;
  const minutePart = parts.find((p) => p.type === 'minute')?.value;
  const h = Number(hourPart ?? '0');
  const m = Number(minutePart ?? '0');

  return (h * 60) + m;
};

export function parseOperatingHoursSchedule(value: unknown): DaySchedule[] {
  const raw = typeof value === 'string' ? (() => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  })() : value;

  const days = Array.isArray((raw as any)?.days)
    ? (raw as any).days
    : (Array.isArray(raw) ? raw : []);

  return days
    .map((d: any) => ({
      day: String(d?.day ?? '').trim(),
      isOpen: Boolean(d?.isOpen),
      start: String(d?.start ?? ''),
      end: String(d?.end ?? ''),
    }))
    .filter((d: DaySchedule) => d.day.length > 0);
}

export function isWithinWorkingHoursAt(schedule: DaySchedule[], at: Date): boolean {
  if (!Array.isArray(schedule) || schedule.length === 0) return false;

  const dayName = getDayNameInIst(at);
  const dayEntry = schedule.find((d) => d.day === dayName);
  if (!dayEntry || !dayEntry.isOpen) return false;

  const currentMinutes = getMinutesInIst(at);
  const start = parseTimeToMinutes(dayEntry.start);
  const end = parseTimeToMinutes(dayEntry.end);
  if (start == null || end == null) return false;

  if (end < start) {
    return currentMinutes >= start || currentMinutes <= end;
  }

  return currentMinutes >= start && currentMinutes <= end;
}

export function isWithinWorkingHoursNow(schedule: DaySchedule[]): boolean {
  return isWithinWorkingHoursAt(schedule, new Date());
}

const parsePreferredWindow = (raw: unknown): { type?: string; scheduledDate?: string | null; scheduledTime?: string | null } => {
  if (raw && typeof raw === 'object') {
    return raw as any;
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return {};

    if (trimmed.startsWith('{')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return { type: trimmed };
      }
    }

    return { type: trimmed };
  }

  return {};
};

export function isPickupWindowWithinSchedule(schedule: DaySchedule[], preferredWindow: unknown): boolean {
  if (!Array.isArray(schedule) || schedule.length === 0) return false;

  const parsed = parsePreferredWindow(preferredWindow);
  const type = String(parsed.type ?? '').toLowerCase();

  if (type === 'anytime' || type === 'any' || type === '') {
    return true;
  }

  let targetDay: string | null = null;
  if (parsed.scheduledDate) {
    const date = new Date(parsed.scheduledDate);
    if (!Number.isNaN(date.getTime())) {
      targetDay = getDayNameInIst(date);
    }
  }

  const dayEntry = targetDay
    ? schedule.find((d) => d.day === targetDay)
    : null;

  if (targetDay && (!dayEntry || !dayEntry.isOpen)) {
    return false;
  }

  const slot = String(parsed.scheduledTime ?? '').trim();
  const requestedRange = SLOT_TO_RANGE[slot] ?? TYPE_TO_RANGE[type] ?? null;

  if (!requestedRange) {
    return true;
  }

  if (!dayEntry) {
    // If day is unknown (legacy payload), only enforce that at least one open day can satisfy the range.
    return schedule.some((d) => {
      if (!d.isOpen) return false;
      const start = parseTimeToMinutes(d.start);
      const end = parseTimeToMinutes(d.end);
      if (start == null || end == null) return false;
      if (end < start) return false;
      return requestedRange.start >= start && requestedRange.end <= end;
    });
  }

  const start = parseTimeToMinutes(dayEntry.start);
  const end = parseTimeToMinutes(dayEntry.end);
  if (start == null || end == null) return false;
  if (end < start) return false;

  return requestedRange.start >= start && requestedRange.end <= end;
}
