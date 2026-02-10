export type AuthData = {
  token: string;
  username?: string;
  email?: string;
  usuarioId?: number;
  empresaId?: number;
  roles?: string[];
  perms?: string[];
};

const KEY = "auth";

export function getAuth(): AuthData | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthData; } catch { return null; }
}

export function setAuth(data: AuthData) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function clearAuth() {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
}

export function isLoggedIn(): boolean {
  const a = getAuth();
  const token = a?.token;
  if (!token) return false;

  const expired = isJwtExpired(token);
  if (expired === true) {
    clearAuth();
    return false;
  }

  return true;
}

function isJwtExpired(token: string): boolean | null {
  // Si no es un JWT (3 partes), no podemos inferir expiración.
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const payload = decodeJwtPayload(parts[1]);
  if (!payload) return null;

  const exp = payload.exp;
  if (typeof exp !== "number") return null;

  const nowSeconds = Math.floor(Date.now() / 1000);
  return nowSeconds >= exp;
}

function decodeJwtPayload(payloadBase64Url: string): Record<string, unknown> | null {
  try {
    const base64 = payloadBase64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "===".slice((base64.length + 3) % 4);
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isAdmin(): boolean {
  const a = getAuth();
  const roles = a?.roles || [];
  return roles.includes("ROLE_ADMIN") || roles.includes("ADMIN");
}

export function canCreateCaja(): boolean {
  const a = getAuth();
  const roles = a?.roles || [];
  return roles.includes("ROLE_ADMIN") || roles.includes("ADMIN") || roles.includes("ROLE_CLIENTE") || roles.includes("CLIENTE");
}
