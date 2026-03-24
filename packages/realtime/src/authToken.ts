export type RealtimeTokenGetter = (() => Promise<string | null>) | null;

let tokenGetter: RealtimeTokenGetter = null;

export function setRealtimeTokenGetter(getter: RealtimeTokenGetter): void {
  tokenGetter = getter;
}

export async function getRealtimeToken(): Promise<string | null> {
  if (!tokenGetter) {
    return null;
  }

  try {
    return await tokenGetter();
  } catch {
    return null;
  }
}
