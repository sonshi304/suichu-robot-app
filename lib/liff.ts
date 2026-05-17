import liff from "@line/liff";

let initialized = false;

export async function initLiff(): Promise<void> {
  if (initialized) return;

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  if (!liffId) {
    console.warn("LIFF ID not set. Running without LINE integration.");
    return;
  }

  try {
    await liff.init({ liffId });
    initialized = true;
  } catch (err) {
    console.error("LIFF initialization failed:", err);
  }
}

export function isInLiff(): boolean {
  try {
    return liff.isInClient();
  } catch {
    return false;
  }
}

export function isLoggedIn(): boolean {
  try {
    return liff.isLoggedIn();
  } catch {
    return false;
  }
}

export async function getLiffProfile() {
  try {
    if (!liff.isLoggedIn()) return null;
    return await liff.getProfile();
  } catch {
    return null;
  }
}

export { liff };
