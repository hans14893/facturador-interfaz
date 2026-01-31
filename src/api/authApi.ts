import { http } from "./http";

export async function login(payload: { username: string; password: string }) {
  const { data } = await http.post("/api/v1/auth/login", payload);
  return data;
}

export async function me() {
  const { data } = await http.get("/api/v1/auth/me");
  return data;
}
