import { apiFetch, setToken, clearToken } from "./client.js";

export interface AdminUser {
  id: string;
  email: string;
}

export async function login(
  email: string,
  password: string,
): Promise<{ token: string; admin: AdminUser }> {
  const res = await apiFetch<{ success: boolean; token: string; admin: AdminUser }>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
  );
  setToken(res.token);
  return { token: res.token, admin: res.admin };
}

export async function getMe(): Promise<AdminUser | null> {
  try {
    const res = await apiFetch<{ admin: AdminUser }>("/api/auth/me", { auth: true });
    return res.admin;
  } catch {
    clearToken();
    return null;
  }
}

export function logout(): void {
  clearToken();
}
