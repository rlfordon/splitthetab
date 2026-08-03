import { cookies } from "next/headers";

const cookieName = (code: string) => `stt_${code.toUpperCase()}`;

/** The participant id this device joined the trip as, or null. */
export async function getIdentity(code: string): Promise<number | null> {
  const store = await cookies();
  const raw = store.get(cookieName(code))?.value;
  if (!raw) return null;
  const id = parseInt(raw, 10);
  return Number.isFinite(id) ? id : null;
}

export async function setIdentity(code: string, participantId: number) {
  const store = await cookies();
  store.set(cookieName(code), String(participantId), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

export async function clearIdentity(code: string) {
  const store = await cookies();
  store.delete(cookieName(code));
}
