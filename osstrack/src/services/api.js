// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SB_URL = "https://yultwpihlrrgzelkyidv.supabase.co";
const SB_KEY = "sb_publishable_IYTw-lZ4vYqIW1n-VBe7iA_b833hsHo";

// ─── DB (REST API) ────────────────────────────────────────────────────────────
export const db = {
  headers: {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  },
  async get(table, query = "") {
    const res = await fetch(`${SB_URL}/rest/v1/${table}${query}`, { headers: this.headers });
    if (!res.ok) throw new Error(`GET ${table} falhou: ${res.status}`);
    return res.json();
  },
  async post(table, data) {
    const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
      method: "POST", headers: this.headers, body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`POST ${table} falhou: ${res.status}`);
    return res.json();
  },
  async patch(table, id, data) {
    const res = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH", headers: this.headers, body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`PATCH ${table} falhou: ${res.status}`);
    return res.json();
  },
  async delete(table, id) {
    const res = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "DELETE", headers: this.headers,
    });
    if (!res.ok) throw new Error(`DELETE ${table} falhou: ${res.status}`);
    return true;
  },
};

// ─── SUPABASE AUTH ────────────────────────────────────────────────────────────
export const auth = {
  async signUp(email, password) {
    const res = await fetch(`${SB_URL}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: SB_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || data.error_description || "Erro no cadastro");
    return data;
  },
  async signIn(email, password) {
    const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: SB_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || "Credenciais inválidas");
    return data;
  },
};