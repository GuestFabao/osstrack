import { useState, useEffect } from "react";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SB_URL = "https://yultwpihlrrgzelkyidv.supabase.co";
const SB_KEY = "sb_publishable_IYTw-lZ4vYqIW1n-VBe7iA_b833hsHo";

// ─── DB (REST API) ────────────────────────────────────────────────────────────
const db = {
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

// ─── SUPABASE AUTH (inline, substitui o supabaseClient.js) ───────────────────
const auth = {
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

// ─── localStorage (com fallback seguro para ambientes sem suporte) ────────────
const store = {
  get(key) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* silencioso */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* silencioso */ }
  },
};

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const FAIXA_COLORS = {
  Branca: "#e5e5e5", 
  Cinza: "#9ca3af",
  Amarela: "#eab308",
  Laranja: "#f97316",
  Verde: "#22c55e",
  Azul: "#3b82f6", 
  Roxa: "#8b5cf6",
  Marrom: "#92400e", 
  Preta: "#1a1a1a",
};
const TODAY = new Date().toISOString().split("T")[0];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const calcFreq = (aluno) => {
  const presentes = aluno.presencas?.length || 0;
  const total = 30;
  return { presentes, total, pct: Math.round((presentes / total) * 100) };
};

const getIniciais = (nome) => {
  if (!nome) return "—";
  return nome.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
};

const parseHorario = (horarioStr) => {
  if (!horarioStr) return null;
  const match = horarioStr.match(/(\d{2}):(\d{2}).*?(\d{2}):(\d{2})/);
  if (!match) return null;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(match[1]), parseInt(match[2]));
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(match[3]), parseInt(match[4]));
  return { start, end };
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  
  html, body { overflow-x: hidden; width: 100%; position: relative; }
  
  :root {
    --bg: #0a0a0a; --surface: #141414; --surface2: #1e1e1e;
    --border: #2a2a2a; --red: #dc2626; --red-dim: #7f1d1d;
    --gold: #d97706; --text: #f0f0f0; --muted: #6b6b6b;
    --green: #16a34a; --radius: 12px;
  }
  
  body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; min-height: 100vh; }
  .app { min-height: 100vh; display: flex; flex-direction: column; width: 100%; overflow-x: hidden; }

  .main { flex: 1; padding: 16px; width: 100%; max-width: 1000px; margin: 0 auto; overflow-x: hidden; }
  
  .grid-2 { display: grid; grid-template-columns: 1fr; gap: 16px; width: 100%; }
  @media (min-width: 768px) { .grid-2 { grid-template-columns: 1fr 1fr; } }
  .grid-4 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
  @media (min-width: 768px) { .grid-4 { grid-template-columns: repeat(4, 1fr); } }
  
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; width: 100%; overflow: hidden; }
  
  /* DB STATUS BAR */
  .db-bar { padding: 7px 20px; font-size: 0.75rem; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--border); }
  .db-bar.ok { background: #052e16; color: #4ade80; }
  .db-bar.err { background: #450a0a; color: #f87171; }
  .db-bar.loading { background: #1c1400; color: #fbbf24; }
  .db-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
  .db-bar.ok .db-dot { animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

  .section-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.2rem; letter-spacing: 2px; margin-bottom: 16px; }

  /* LOGIN */
  .login-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: radial-gradient(ellipse at 60% 20%, #1a0000 0%, #0a0a0a 70%); padding: 24px; }
  .login-card { width: 100%; max-width: 420px; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 40px 36px; position: relative; overflow: hidden; }
  .login-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--red); }
  .login-logo { font-family: 'Bebas Neue', sans-serif; font-size: 2.6rem; letter-spacing: 3px; color: var(--text); line-height: 1; }
  .login-logo span { color: var(--red); }
  .input-group { margin-bottom: 16px; text-align: left; }
  .input-group label { display: block; font-size: 0.78rem; font-weight: 500; color: var(--muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; }
  .input-group input, .input-group select { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; color: var(--text); font-size: 0.95rem; font-family: inherit; transition: border-color 0.2s; }
  .input-group input:focus, .input-group select:focus { outline: none; border-color: var(--red); }

  /* BUTTONS */
  .btn-primary { width: 100%; background: var(--red); color: white; border: none; padding: 13px; border-radius: 8px; font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; letter-spacing: 2px; cursor: pointer; transition: all 0.2s; }
  .btn-primary:hover { opacity: 0.9; }
  .btn-primary:active { transform: scale(0.98); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-secondary { width: 100%; background: var(--surface2); color: var(--text); border: 1px solid var(--border); padding: 13px; border-radius: 8px; font-family: 'Bebas Neue', sans-serif; font-size: 1rem; letter-spacing: 2px; cursor: pointer; transition: all 0.2s; }
  .btn-secondary:hover { background: var(--border); }
  .btn-danger { width: 100%; background: #450a0a; color: #f87171; border: 1px solid var(--red-dim); padding: 13px; border-radius: 8px; font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; letter-spacing: 2px; cursor: pointer; transition: all 0.2s; }
  .btn-danger:hover { background: #7f1d1d; color: white; }
  .err { color: #f87171; font-size: 0.82rem; margin-top: 8px; }

  /* MODAL */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 299; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .modal-box { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 420px; padding: 28px; position: relative; animation: slideUp 0.2s ease; max-height: 90vh; overflow-y: auto; }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .modal-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.6rem; letter-spacing: 2px; margin-bottom: 20px; text-align: center; }
  .btn-close { position: absolute; top: 20px; right: 20px; background: none; border: none; color: var(--muted); cursor: pointer; font-size: 1.2rem; z-index: 10; }

  /* TOPNAV */
  .topnav { background: var(--surface); border-bottom: 1px solid var(--border); padding: 0 20px; display: flex; align-items: center; justify-content: space-between; height: 56px; position: sticky; top: 0; z-index: 100; }
  .nav-logo { font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem; letter-spacing: 2px; }
  .nav-logo span { color: var(--red); }
  .nav-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .nav-user { font-size: 0.82rem; color: var(--muted); display: none; }
  @media (min-width: 480px) { .nav-user { display: inline-block; } }
  .btn-logout { background: var(--border); border: none; color: var(--muted); font-family: inherit; font-size: 0.78rem; padding: 5px 10px; border-radius: 6px; cursor: pointer; transition: all 0.15s; }
  .btn-logout:hover { background: var(--red-dim); color: white; }
  .academy-select { background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; font-size: 0.8rem; font-family: inherit; outline: none; cursor: pointer; max-width: 150px; }
  .academy-select:focus { border-color: var(--red); }

  /* ADMIN HEADER & FILTERS */
  .page-header { margin-bottom: 24px; }
  .page-header h1 { font-family: 'Bebas Neue', sans-serif; font-size: 2rem; letter-spacing: 3px; }
  .page-header p { color: var(--muted); font-size: 0.85rem; margin-top: 2px; }
  .filters { display: flex; gap: 10px; flex-wrap: wrap; }
  .filter-btn { background: var(--surface2); border: 1px solid var(--border); color: var(--muted); font-family: inherit; font-size: 0.8rem; padding: 6px 14px; border-radius: 20px; cursor: pointer; transition: all 0.15s; }
  .filter-btn.active { background: var(--red); border-color: var(--red); color: white; }

  /* TABLE & BADGES */
  .table-wrap { overflow-x: auto; width: 100%; max-width: 100%; }
  table { width: 100%; min-width: 300px; border-collapse: collapse; font-size: 0.88rem; }
  th { text-align: left; padding: 10px 14px; color: var(--muted); font-weight: 500; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid var(--border); }
  td { padding: 12px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--surface2); }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 500; }
  .badge-presente { background: #14532d; color: #4ade80; }
  .badge-faixa { display: inline-block; width: 32px; height: 8px; border-radius: 2px; border: 1px solid rgba(255,255,255,0.1); }
  .avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; flex-shrink: 0; background: var(--red-dim); overflow: hidden; }

  /* STAT CARDS */
  .stat-card { display: flex; flex-direction: column; gap: 6px; }
  .stat-label { font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }
  .stat-value { font-family: 'Bebas Neue', sans-serif; font-size: 2.2rem; line-height: 1; }
  .stat-value.red { color: var(--red); } .stat-value.green { color: var(--green); } .stat-value.gold { color: var(--gold); }
  .stat-sub { font-size: 0.78rem; color: var(--muted); }

  /* PROGRESS BAR */
  .prog-bar { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
  .prog-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }

  /* DETAIL PANEL */
  .detail-panel { position: fixed; right: 0; top: 0; bottom: 0; width: 360px; max-width: 100%; background: var(--surface); border-left: 1px solid var(--border); padding: 24px; z-index: 200; overflow-y: auto; animation: slideIn 0.25s ease; display: flex; flex-direction: column; }
  @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
  .hoje-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.15s; }
  .hoje-item:hover { background: var(--surface2); }
  .hoje-item:last-child { border-bottom: none; }

  /* ALUNO VIEW */
  .aluno-hero { background: linear-gradient(135deg, #1a0000 0%, var(--surface) 60%); border: 1px solid var(--border); border-radius: 16px; padding: 28px; margin-bottom: 24px; display: flex; align-items: center; gap: 24px; position: relative; overflow: hidden; flex-wrap: wrap; }
  .aluno-hero::after { content: 'BJJ'; position: absolute; right: -10px; top: 50%; transform: translateY(-50%); font-family: 'Bebas Neue', sans-serif; font-size: 7rem; color: rgba(255,255,255,0.03); letter-spacing: 4px; pointer-events: none; }
  .aluno-avatar { width: 72px; height: 72px; border-radius: 50%; background: var(--red); display: flex; align-items: center; justify-content: center; font-family: 'Bebas Neue', sans-serif; font-size: 1.6rem; letter-spacing: 1px; flex-shrink: 0; overflow: hidden; }
  .aluno-nome { font-family: 'Bebas Neue', sans-serif; font-size: 1.8rem; letter-spacing: 2px; }
  .aluno-meta { font-size: 0.83rem; color: var(--muted); margin-top: 2px; }

  /* CHECKIN */
  .checkin-zone { text-align: center; padding: 32px 0; }
  .checkin-btn { width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #3a0000, #1a0000); border: 2px solid var(--red); color: white; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; transition: all 0.25s; box-shadow: 0 0 40px rgba(220,38,38,0.2); font-family: inherit; margin: 0 auto; }
  .checkin-btn:hover { box-shadow: 0 0 60px rgba(220,38,38,0.4); transform: scale(1.05); }
  .checkin-btn.done { background: radial-gradient(circle at 40% 35%, #003a00, #001a00); border-color: var(--green); box-shadow: 0 0 40px rgba(22,163,74,0.2); cursor: default; }
  .checkin-btn.done:hover { transform: scale(1); box-shadow: 0 0 40px rgba(22,163,74,0.2); }
  .checkin-icon { font-size: 2.4rem; }
  .checkin-text { font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; letter-spacing: 2px; }
  .checkin-sub { font-size: 0.75rem; color: var(--muted); }
  .aula-info { margin-top: 16px; font-size: 0.83rem; color: var(--muted); }
  .aula-info strong { color: var(--text); }

  /* HISTÓRICO - Fix para o calendário não estourar */
  .hist-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; width: 100%; max-width: 300px; margin: 0 auto; }
  .hist-day { aspect-ratio: 1; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; color: var(--muted); transition: transform 0.15s; }
  .hist-day.presente { background: #14532d; color: #4ade80; font-weight: 600; }
  .hist-day.falta { background: var(--surface2); }
  .hist-day:hover { transform: scale(1.15); }
  .hist-legend { display: flex; gap: 16px; margin-top: 12px; font-size: 0.75rem; color: var(--muted); justify-content: center; }
  .hist-legend span { display: flex; align-items: center; gap: 6px; }
  .dot { width: 10px; height: 10px; border-radius: 2px; }
`;

// ─── DB STATUS BAR ─────────────────────────────────────────────────────────────
function DbStatusBar({ status, turmasCount, erro }) {
  if (status === "loading") return <div className="db-bar loading"><div className="db-dot" />Conectando ao Supabase…</div>;
  if (status === "error")   return <div className="db-bar err"><div className="db-dot" />Erro: {erro}</div>;
  return <div className="db-bar ok"><div className="db-dot" />Supabase conectado · {turmasCount} turmas carregadas</div>;
}

// ─── SETTINGS ──────────────────────────────────────────────────────
function Settings() {
  const [email, setEmail] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [msg, setMsg] = useState("");

  const salvar = async () => {
    if (!novaSenha || novaSenha.length < 6) {
      setMsg("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    try {
      const data = await auth.signIn(email, senhaAtual);
      if (data.access_token) {
        setMsg("✓ Identidade confirmada. Funcionalidade de troca de senha disponível na versão com Supabase SDK completo.");
      }
    } catch (e) {
      setMsg("Erro: " + e.message);
    }
  };

  return (
    <div>
      <div className="input-group">
        <label>E-mail Admin</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
      </div>
      <div className="input-group">
        <label>Senha Atual</label>
        <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} placeholder="••••••" />
      </div>
      <div className="input-group">
        <label>Nova Senha</label>
        <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="••••••" />
      </div>
      {msg && <div style={{ fontSize: "0.82rem", color: msg.startsWith("✓") ? "var(--green)" : "#f87171", marginBottom: "12px" }}>{msg}</div>}
      <button className="btn-secondary" style={{ width: "auto", padding: "10px 20px", fontSize: "0.9rem" }} onClick={salvar}>
        SALVAR ALTERAÇÕES
      </button>
    </div>
  );
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────────
function Login({ onLogin, todosAlunos }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const handle = async () => {
    setErro("");
    setCarregando(true);
    try {
      const alunoEncontrado = todosAlunos.find(
        (a) => a.nome.toLowerCase() === email.toLowerCase()
      );
      
      if (alunoEncontrado && pass === "4131") {
        onLogin({ username: alunoEncontrado.nome, role: "aluno", alunoId: alunoEncontrado.id });
        return;
      }
      await auth.signIn(email, pass);
      onLogin({ username: email.split("@")[0], role: "admin" });
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">OSS<span>.</span>TRACK</div>
        <div style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "4px", marginBottom: "32px" }}>
          {isSignUp ? "Criar Conta Admin" : "Sistema de Presença — TEAM CRUZ BJJ"}
        </div>
        <div className="input-group">
          <label>{isSignUp ? "E-mail de Cadastro" : "E-mail (Admin) ou Nome (Aluno)"}</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={isSignUp ? "seu@email.com" : "Ex: João da Silva"} onKeyDown={(e) => e.key === "Enter" && handle()} />
        </div>
        <div className="input-group">
          <label>Senha</label>
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••" onKeyDown={(e) => e.key === "Enter" && handle()} />
        </div>
        {erro && <div className="err">{erro}</div>}
        <button className="btn-primary" onClick={handle} disabled={carregando} style={{ marginTop: "8px" }}>
          {carregando ? "AGUARDE..." : isSignUp ? "CADASTRAR" : "ENTRAR"}
        </button>
      </div>
    </div>
  );
}

// ─── ALUNO VIEW ────────────────────────────────────────────────────────────────
function AlunoView({ aluno, turmas, carregarBanco }) {
  const [salvando, setSalvando] = useState(false);
  
  if (!aluno) return <div className="main"><p style={{ color: "var(--muted)" }}>Carregando perfil…</p></div>;

  const presencas = aluno?.presencas || [];
  const checkedIn = presencas.some((p) => p.data === TODAY);
  const freq = calcFreq({ ...aluno, presencas });
  const turmaAluno = turmas.find((t) => t.id === aluno?.turma_id);

  let btnText = "CHECK-IN", btnSub = "Toque para marcar", isDisabled = false;
  if (checkedIn) {
    btnText = "PRESENTE!"; btnSub = "Oss! Boa aula!"; isDisabled = true;
  } else if (!turmaAluno) {
    btnText = "SEM TURMA"; btnSub = "Fale com o professor"; isDisabled = true;
  } else {
    const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const hojeStr = diasSemana[new Date().getDay()];
    const isDiaDeTreino = turmaAluno.dias.includes(hojeStr);
    if (!isDiaDeTreino) {
      btnText = "DESCANSO"; btnSub = "Hoje não é dia de treino"; isDisabled = true;
    } else {
      const times = parseHorario(turmaAluno.horario);
      if (times) {
        const now = new Date();
        const windowStart = new Date(times.start);
        windowStart.setMinutes(windowStart.getMinutes() - 30);
        if (now < windowStart) {
          const h = String(windowStart.getHours()).padStart(2, "0");
          const m = String(windowStart.getMinutes()).padStart(2, "0");
          btnText = "AGUARDE"; btnSub = `Liberado às ${h}:${m}`; isDisabled = true;
        } else if (now > times.end) {
          btnText = "ENCERRADO"; btnSub = "A aula já terminou"; isDisabled = true;
        } else {
          btnText = salvando ? "SALVANDO..." : "CHECK-IN";
          btnSub = "Toque para marcar"; isDisabled = salvando;
        }
      }
    }
  }

  const doCheckin = async () => {
    if (isDisabled) return;
    setSalvando(true);
    try {
      const now = new Date();
      const hora = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      await db.post("presencas", { aluno_id: aluno.id, turma_id: aluno.turma_id, data: TODAY, hora });
      await carregarBanco();
    } catch (err) {
      alert("Erro ao fazer check-in: " + err.message);
    } finally {
      setSalvando(false);
    }
  };

  const date = new Date();
  const year = date.getFullYear(), month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push({ key: `e-${i}`, presente: false, temAula: false, label: "" });
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    const key = d.toISOString().split("T")[0];
    days.push({ key, presente: presencas.some((p) => p.data === key), temAula: d.getDay() !== 0 && d.getDay() !== 6, label: String(i) });
  }

  return (
    <div className="main">
      <div className="aluno-hero">
        <div className="aluno-avatar">{aluno.foto}</div>
        <div>
          <div className="aluno-nome">{aluno.nome}</div>
          <div className="aluno-meta">
            Faixa <span style={{ color: FAIXA_COLORS[aluno.faixa] || "#ccc" }}>{aluno.faixa}</span> ({aluno.graus || 0} Graus)
            &nbsp;·&nbsp;{turmaAluno?.nome || "Sem turma"}
          </div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "center" }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.2rem", color: freq.pct >= 75 ? "var(--green)" : "var(--red)" }}>{freq.pct}%</div>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>frequência</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="section-title">Marcar Presença</div>
          <div className="checkin-zone">
            <button className={`checkin-btn ${checkedIn ? "done" : ""}`} onClick={doCheckin} disabled={isDisabled} style={{ opacity: isDisabled && !checkedIn ? 0.4 : 1 }}>
              <span className="checkin-icon">{checkedIn ? "✓" : btnText === "ENCERRADO" || btnText === "DESCANSO" ? "🔒" : btnText === "AGUARDE" ? "⏳" : "👊"}</span>
              <span className="checkin-text">{btnText}</span>
              <span className="checkin-sub">{btnSub}</span>
            </button>
            <div className="aula-info">{turmaAluno ? <>Sua turma: <strong>{turmaAluno.nome}</strong> · {turmaAluno.horario}</> : "Sem turma vinculada 🥋"}</div>
          </div>
        </div>

        <div className="card">
          <div className="section-title">Mês de {date.toLocaleDateString("pt-BR", { month: "long" })}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", marginBottom: "6px" }}>
            {["D","S","T","Q","Q","S","S"].map((d, i) => <div key={i} style={{ textAlign: "center", fontSize: "0.6rem", color: "var(--muted)", padding: "4px 0" }}>{d}</div>)}
          </div>
          <div className="hist-grid">
            {days.map((d) => <div key={d.key} className={`hist-day ${d.presente ? "presente" : d.temAula ? "falta" : ""}`} title={d.key}>{d.label}</div>)}
          </div>
          <div className="hist-legend" style={{ marginTop: "12px" }}>
            <span><div className="dot" style={{ background: "#14532d" }} />Presente</span>
            <span><div className="dot" style={{ background: "#1e1e1e" }} />Falta</span>
          </div>
          <div style={{ marginTop: "16px", display: "flex", gap: "24px" }}>
            <div><div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", color: "var(--green)" }}>{freq.presentes}</div><div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>presenças</div></div>
            <div><div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", color: "var(--red)" }}>{freq.total - freq.presentes}</div><div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>faltas</div></div>
            <div><div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", color: "var(--gold)" }}>{freq.total}</div><div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>total</div></div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "20px" }}>
        <div className="section-title">Histórico Recente</div>
        {presencas.length === 0 ? <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Nenhuma presença registrada ainda.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Data</th><th>Turma</th><th>Hora</th><th>Status</th></tr></thead>
              <tbody>
                {[...presencas].reverse().slice(0, 8).map((p) => (
                  <tr key={p.id}>
                    <td>{new Date(p.data + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                    <td>{turmas.find((t) => t.id === p.turma_id)?.nome || "—"}</td>
                    <td>{p.hora?.substring(0, 5)}</td>
                    <td><span className="badge badge-presente">Presente</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ADMIN VIEW ────────────────────────────────────────────────────────────────
function AdminView({ turmas, alunos, carregarBanco, academiaAtual }) {
  const [tab, setTab] = useState("dashboard");
  const [filtroTurma, setFiltroTurma] = useState("Todas");
  const [detalhe, setDetalhe] = useState(null);
  const [modalAlunoOpen, setModalAlunoOpen] = useState(false);
  const [formAluno, setFormAluno] = useState({ id: null, nome: "", faixa: "Branca", graus: "0", turma_id: "" });
  const [modalTurmaOpen, setModalTurmaOpen] = useState(false);
  const [formTurma, setFormTurma] = useState({ id: null, nome: "", horario: "", dias: "" });
  const [salvando, setSalvando] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      if (detalhe) { setDetalhe(null); window.history.pushState(null, "", window.location.href); }
      else setShowExitModal(true);
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [detalhe]);

  const togglePresencaManual = async (aluno) => {
    const presencaHoje = aluno.presencas?.find((p) => p.data === TODAY);
    if (presencaHoje) {
      if (!window.confirm(`Remover a presença de ${aluno.nome}?`)) return;
      try { await db.delete("presencas", presencaHoje.id); await carregarBanco(); }
      catch (err) { alert("Erro: " + err.message); }
    } else {
      try {
        const now = new Date();
        const hora = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        await db.post("presencas", { aluno_id: aluno.id, turma_id: aluno.turma_id, data: TODAY, hora });
        await carregarBanco();
      } catch (err) { alert("Erro: " + err.message); }
    }
  };

  const presencasHoje = alunos.filter((a) => a.presencas?.some((p) => p.data === TODAY));
  const faltasHoje = alunos.length - presencasHoje.length;
  const freqMedia = alunos.length ? Math.round(alunos.reduce((s, a) => s + calcFreq(a).pct, 0) / alunos.length) : 0;
  const alunosFiltrados = filtroTurma === "Todas" ? alunos : alunos.filter((a) => turmas.find((t) => t.id === a.turma_id)?.nome === filtroTurma);

  const abrirModalAlunoNovo = () => {
    if (turmas.length === 0) return alert("Cadastre uma turma nesta unidade primeiro!");
    setFormAluno({ id: null, nome: "", faixa: "Branca", graus: "0", turma_id: turmas[0]?.id || "" }); 
    setModalAlunoOpen(true); 
  };
  const abrirModalAlunoEditar = (a) => { setFormAluno({ id: a.id, nome: a.nome, faixa: a.faixa, graus: String(a.graus || 0), turma_id: a.turma_id }); setModalAlunoOpen(true); };

  const excluirAluno = async (id) => {
    if (!window.confirm("Excluir aluno? Todas as presenças serão apagadas.")) return;
    try { await db.delete("alunos", id); await carregarBanco(); setDetalhe(null); }
    catch (err) { alert("Erro: " + err.message); }
  };

  const salvarAluno = async (e) => {
    e.preventDefault();
    if (!formAluno.nome || !formAluno.turma_id) return alert("Preencha nome e turma!");
    setSalvando(true);
    try {
      const payload = { 
        nome: formAluno.nome, 
        faixa: formAluno.faixa, 
        graus: parseInt(formAluno.graus), 
        turma_id: formAluno.turma_id,
        academia_id: academiaAtual?.id // <-- Vínculo Inteligente com a academia
      };
      if (formAluno.id) { await db.patch("alunos", formAluno.id, payload); if (detalhe?.id === formAluno.id) setDetalhe({ ...detalhe, ...payload }); }
      else await db.post("alunos", payload);
      await carregarBanco(); setModalAlunoOpen(false);
    } catch (err) { alert("Erro: " + err.message); } finally { setSalvando(false); }
  };

  const abrirModalTurmaNova = () => { setFormTurma({ id: null, nome: "", horario: "", dias: "" }); setModalTurmaOpen(true); };
  const abrirModalTurmaEditar = (t) => { setFormTurma({ id: t.id, nome: t.nome, horario: t.horario, dias: t.dias }); setModalTurmaOpen(true); };

  const salvarTurma = async (e) => {
    e.preventDefault();
    if (!formTurma.nome || !formTurma.horario) return alert("Nome e horário obrigatórios!");
    setSalvando(true);
    try { 
      if (formTurma.id) {
        await db.patch("turmas", formTurma.id, { nome: formTurma.nome, horario: formTurma.horario, dias: formTurma.dias }); 
      } else {
        await db.post("turmas", { nome: formTurma.nome, horario: formTurma.horario, dias: formTurma.dias, academia_id: academiaAtual?.id });
      }
      await carregarBanco(); setModalTurmaOpen(false); 
    }
    catch (err) { alert("Erro: " + err.message); } finally { setSalvando(false); }
  };

  return (
    <div className="main">
      {/* MODAL SAIR */}
      {showExitModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ textAlign: "center" }}>
            <div className="modal-title">SAIR DO APP?</div>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: "24px" }}>Você realmente deseja fechar o OSS.TRACK?</p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button className="btn-secondary" onClick={() => setShowExitModal(false)}>CANCELAR</button>
              <button className="btn-danger" onClick={() => window.history.back()}>SAIR</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ALUNO */}
      {modalAlunoOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <button className="btn-close" onClick={() => setModalAlunoOpen(false)}>✕</button>
            <div className="modal-title">{formAluno.id ? "EDITAR ALUNO" : "NOVO ALUNO"}</div>
            <form onSubmit={salvarAluno}>
              <div className="input-group"><label>Nome Completo</label><input autoFocus value={formAluno.nome} onChange={(e) => setFormAluno({ ...formAluno, nome: e.target.value })} placeholder="Ex: João da Silva" /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="input-group"><label>Faixa</label><select value={formAluno.faixa} onChange={(e) => setFormAluno({ ...formAluno, faixa: e.target.value })}>{Object.keys(FAIXA_COLORS).map((f) => <option key={f}>{f}</option>)}</select></div>
                <div className="input-group"><label>Graus</label><select value={formAluno.graus} onChange={(e) => setFormAluno({ ...formAluno, graus: e.target.value })}>{[0,1,2,3,4].map((g) => <option key={g} value={g}>{g} {g === 1 ? "Grau" : "Graus"}</option>)}</select></div>
              </div>
              <div className="input-group"><label>Turma</label><select value={formAluno.turma_id} onChange={(e) => setFormAluno({ ...formAluno, turma_id: e.target.value })}>{turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></div>
              <button type="submit" className="btn-primary" style={{ marginTop: "16px" }} disabled={salvando}>{salvando ? "SALVANDO..." : formAluno.id ? "SALVAR" : "CADASTRAR"}</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TURMA */}
      {modalTurmaOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <button className="btn-close" onClick={() => setModalTurmaOpen(false)}>✕</button>
            <div className="modal-title">{formTurma.id ? "EDITAR TURMA" : "NOVA TURMA"}</div>
            <form onSubmit={salvarTurma}>
              <div className="input-group"><label>Nome</label><input autoFocus value={formTurma.nome} onChange={(e) => setFormTurma({ ...formTurma, nome: e.target.value })} placeholder="Ex: Manhã" /></div>
              <div className="input-group"><label>Horário</label><input value={formTurma.horario} onChange={(e) => setFormTurma({ ...formTurma, horario: e.target.value })} placeholder="Ex: 07:00 – 08:30" /></div>
              <div className="input-group"><label>Dias da Semana</label><input value={formTurma.dias} onChange={(e) => setFormTurma({ ...formTurma, dias: e.target.value })} placeholder="Ex: Seg / Qua / Sex" /></div>
              <button type="submit" className="btn-primary" style={{ marginTop: "16px" }} disabled={salvando}>{salvando ? "SALVANDO..." : "SALVAR"}</button>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL PANEL */}
      {detalhe && (
        <>
          <div className="modal-overlay" onClick={() => setDetalhe(null)} style={{ background: "rgba(0,0,0,0.5)", zIndex: 199 }} />
          <div className="detail-panel">
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                <strong style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.1rem" }}>FICHA DO ALUNO</strong>
                <button style={{ background: "none", border: "none", color: "var(--text)", cursor: "pointer" }} onClick={() => setDetalhe(null)}>✕</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
                <div className="avatar" style={{ background: "var(--red)", width: 50, height: 50, fontSize: "1rem" }}>{detalhe.foto}</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{detalhe.nome}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Faixa <span style={{ color: FAIXA_COLORS[detalhe.faixa] }}>{detalhe.faixa}</span> • {detalhe.graus || 0} Graus</div>
                </div>
              </div>
            </div>
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "0.9rem", color: "var(--muted)", marginBottom: "10px" }}>ÚLTIMAS PRESENÇAS</div>
              {detalhe.presencas?.length > 0 ? [...detalhe.presencas].reverse().slice(0, 6).map((p) => (
                <div key={p.id} style={{ fontSize: "0.8rem", padding: "8px 0", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
                  <span>{new Date(p.data + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                  <span style={{ color: "var(--green)" }}>{p.hora?.substring(0, 5)}</span>
                </div>
              )) : <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Nenhuma presença ainda.</p>}
            </div>
            <div style={{ marginTop: "auto", display: "flex", gap: "12px", flexDirection: "column" }}>
              <button className="btn-primary" style={{ padding: "10px", fontSize: "1rem" }} onClick={() => abrirModalAlunoEditar(detalhe)}>✏️ EDITAR DADOS</button>
              <button className="btn-danger" style={{ padding: "10px", fontSize: "1rem" }} onClick={() => excluirAluno(detalhe.id)}>🗑️ EXCLUIR ALUNO</button>
            </div>
          </div>
        </>
      )}

      {/* PAGE HEADER + TABS */}
      <div className="page-header">
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          {["dashboard", "hoje", "turmas", "alunos", "config"].map((t) => (
            <button key={t} className={`filter-btn ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t === "dashboard" ? "📊 Dashboard" : t === "hoje" ? "📋 Hoje" : t === "turmas" ? "🏋️ Turmas" : t === "alunos" ? "🥋 Alunos" : "⚙️ Config"}
            </button>
          ))}
        </div>
        <h1>{tab === "dashboard" ? "Dashboard" : tab === "hoje" ? "Presenças de Hoje" : tab === "turmas" ? "Turmas" : tab === "alunos" ? "Alunos" : "Configurações"}</h1>
        {tab === "hoje" && <p>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>}
      </div>

      {/* DASHBOARD */}
      {tab === "dashboard" && (
        <>
          <div className="grid-4">
            <div className="card stat-card"><div className="stat-label">Total de Alunos</div><div className="stat-value">{alunos.length}</div><div className="stat-sub">Matriculados</div></div>
            <div className="card stat-card"><div className="stat-label">Presentes Hoje</div><div className="stat-value green">{presencasHoje.length}</div><div className="stat-sub">Registrados</div></div>
            <div className="card stat-card"><div className="stat-label">Faltas Hoje</div><div className="stat-value red">{faltasHoje}</div><div className="stat-sub">Ausentes</div></div>
            <div className="card stat-card"><div className="stat-label">Freq. Média</div><div className="stat-value gold">{freqMedia}%</div><div className="stat-sub">Geral da Academia</div></div>
          </div>
          <div className="grid-2">
            <div className="card">
              <div className="section-title">Frequência da Academia</div>
              {alunos.length === 0 ? <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Nenhum aluno cadastrado ainda.</p>
                : alunos.map((a) => { const f = calcFreq(a); return (
                  <div key={a.id} style={{ marginBottom: "14px", cursor: "pointer" }} onClick={() => setDetalhe(a)}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px", fontSize: "0.83rem" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}><span className="badge-faixa" style={{ background: FAIXA_COLORS[a.faixa] }} />{a.nome}</span>
                      <span style={{ color: f.pct >= 75 ? "var(--green)" : "var(--red)", fontWeight: 600 }}>{f.pct}%</span>
                    </div>
                    <div className="prog-bar"><div className="prog-fill" style={{ width: `${f.pct}%`, background: f.pct >= 75 ? "var(--green)" : f.pct >= 60 ? "var(--gold)" : "var(--red)" }} /></div>
                  </div>
                ); })}
            </div>
            <div className="card">
              <div className="section-title">Alunos em Risco ⚠️</div>
              {alunos.filter((a) => calcFreq(a).pct < 70).length === 0
                ? <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Nenhum aluno em risco. 🎉</p>
                : alunos.filter((a) => calcFreq(a).pct < 70).map((a) => { const f = calcFreq(a); return (
                  <div key={a.id} className="hoje-item" onClick={() => setDetalhe(a)}>
                    <div className="avatar" style={{ background: "var(--red-dim)" }}>{a.foto}</div>
                    <div><div style={{ fontSize: "0.88rem", fontWeight: 500 }}>{a.nome}</div><div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{f.total - f.presentes} faltas · {turmas.find((t) => t.id === a.turma_id)?.nome}</div></div>
                    <span style={{ marginLeft: "auto", color: "var(--red)", fontWeight: 700 }}>{f.pct}%</span>
                  </div>
                ); })}
            </div>
          </div>
        </>
      )}

      {/* HOJE */}
      {tab === "hoje" && (
        <div className="grid-2">
          <div className="card">
            <div className="section-title" style={{ color: "var(--green)" }}>✓ Presentes ({presencasHoje.length})</div>
            {presencasHoje.length === 0 && <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Ninguém fez check-in ainda.</p>}
            {presencasHoje.map((a) => {
              const p = a.presencas.find((x) => x.data === TODAY);
              return (
                <div key={a.id} className="hoje-item" onClick={() => setDetalhe(a)}>
                  <div className="avatar" style={{ background: "#14532d", color: "#4ade80" }}>{a.foto}</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: "0.88rem", fontWeight: 500 }}>{a.nome}</div><div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{turmas.find((t) => t.id === p?.turma_id)?.nome} · {p?.hora?.substring(0, 5)}</div></div>
                  <button onClick={(e) => { e.stopPropagation(); togglePresencaManual(a); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem" }} title="Remover presença">❌</button>
                </div>
              );
            })}
          </div>
          <div className="card">
            <div className="section-title" style={{ color: "var(--red)" }}>✗ Ausentes ({faltasHoje})</div>
            {faltasHoje === 0 && alunos.length > 0 && <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Todos estão presentes! 🎉</p>}
            {alunos.filter((a) => !a.presencas?.some((p) => p.data === TODAY)).map((a) => (
              <div key={a.id} className="hoje-item" onClick={() => setDetalhe(a)}>
                <div className="avatar" style={{ background: "#450a0a", color: "#f87171" }}>{a.foto}</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: "0.88rem", fontWeight: 500 }}>{a.nome}</div><div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{turmas.find((t) => t.id === a.turma_id)?.nome}</div></div>
                <button onClick={(e) => { e.stopPropagation(); togglePresencaManual(a); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem" }} title="Dar presença manual">✅</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TURMAS */}
      {tab === "turmas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {turmas.length === 0 && <p style={{ color: "var(--muted)" }}>Nenhuma turma nesta unidade.</p>}
          {turmas.map((t) => {
            const qAlunos = alunos.filter((a) => a.turma_id === t.id).length;
            return (
              <div key={t.id} className="card" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ fontSize: "1.6rem" }}>🥋</div>
                <div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.1rem", letterSpacing: "1px" }}>{t.nome}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "2px" }}>{t.horario} · {t.dias}</div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", color: "var(--gold)" }}>{qAlunos}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>alunos</div>
                  </div>
                  <button className="filter-btn" onClick={() => abrirModalTurmaEditar(t)}>✏️ Editar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ALUNOS */}
      {tab === "alunos" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
            <div className="filters">
              {["Todas", ...turmas.map((t) => t.nome)].map((t) => (
                <button key={t} className={`filter-btn ${filtroTurma === t ? "active" : ""}`} onClick={() => setFiltroTurma(t)}>{t}</button>
              ))}
            </div>
            <button className="btn-primary" style={{ width: "auto", padding: "8px 18px", fontSize: "0.9rem" }} onClick={abrirModalAlunoNovo}>+ NOVO ALUNO</button>
          </div>
          {alunosFiltrados.length === 0
            ? <p style={{ color: "var(--muted)" }}>Nenhum aluno nesta turma.</p>
            : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Aluno</th><th>Faixa e Grau</th><th>Turma</th><th>Ações</th></tr></thead>
                  <tbody>
                    {alunosFiltrados.map((a) => (
                      <tr key={a.id}>
                        <td><div style={{ display: "flex", alignItems: "center", gap: "10px" }}><div className="avatar">{a.foto}</div>{a.nome}</div></td>
                        <td><span style={{ display: "flex", alignItems: "center", gap: "7px" }}><span className="badge-faixa" style={{ background: FAIXA_COLORS[a.faixa] }} />{a.faixa} ({a.graus || 0} graus)</span></td>
                        <td style={{ color: "var(--muted)" }}>{turmas.find((t) => t.id === a.turma_id)?.nome}</td>
                        <td><button className="filter-btn" onClick={() => setDetalhe(a)}>Ver Perfil</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {/* CONFIG */}
      {tab === "config" && (
        <>
          <div className="card" style={{ marginBottom: "20px" }}>
            <div className="section-title">Minha Conta</div>
            <Settings />
          </div>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div className="section-title" style={{ margin: 0 }}>Gerenciar Turmas</div>
              <button className="btn-primary" style={{ width: "auto", padding: "6px 14px", fontSize: "0.85rem" }} onClick={abrirModalTurmaNova}>+ NOVA TURMA</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {turmas.length === 0 && <p style={{ color: "var(--muted)" }}>Nenhuma turma nesta unidade.</p>}
              {turmas.map((t) => (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", border: "1px solid var(--border)", borderRadius: "8px", background: "var(--surface2)", gap: "12px", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.1rem", letterSpacing: "1px" }}>{t.nome}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "4px" }}>{t.horario} · {t.dias}</div>
                  </div>
                  <button className="filter-btn" onClick={() => abrirModalTurmaEditar(t)}>✏️ EDITAR</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(() => store.get("osstrack_session"));
  
  // ESTADOS DO MULTI-TENANCY 
  const [academias, setAcademias] = useState([]);
  
  // LÊ A ACADEMIA SALVA APENAS SE FOR ADMIN
  const [academiaAtual, setAcademiaAtual] = useState(() => store.get("osstrack_admin_academia") || null);
  
  // A CHAVE DO LOGIN GLOBAL
  const [todosAlunos, setTodosAlunos] = useState([]); 
  
  const [turmas, setTurmas] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [dbStatus, setDbStatus] = useState("loading");
  const [dbErro, setDbErro] = useState("");

  // Salva sessão no navegador
  useEffect(() => {
    if (session) store.set("osstrack_session", session);
    else store.remove("osstrack_session");
  }, [session]);

  // Salva academia no navegador APENAS se quem estiver usando for o Admin
  useEffect(() => {
    if (academiaAtual && session?.role === "admin") {
      store.set("osstrack_admin_academia", academiaAtual);
    }
  }, [academiaAtual, session]);

  // MOTOR DE BUSCA OTIMIZADO
  const carregarBanco = async (idForcado = null) => {
    try {
      setDbStatus("loading");
      
      // 1. Carrega as academias
      const academiasData = await db.get("academias", "?order=nome");
      if (Array.isArray(academiasData)) {
        setAcademias(academiasData);
      }

      // 2. Busca todos os alunos globalmente
      const todosOsAlunosData = await db.get("alunos", "?select=*,presencas(*)&order=nome");
      let listaGlobal = [];
      if (Array.isArray(todosOsAlunosData)) {
         listaGlobal = todosOsAlunosData.map(a => ({
             ...a,
             foto: getIniciais(a.nome),
             presencas: a.presencas || []
         }));
         setTodosAlunos(listaGlobal); 
      }

      let idAtivo = idForcado;

      // ─── A CORREÇÃO DE FERRO AQUI ──────────────────────────────
      if (!idAtivo) {
        if (session?.role === "aluno") {
          // Se for aluno, o app É OBRIGADO a olhar para a academia DELE
          const meuPerfil = listaGlobal.find(a => a.id === session.alunoId);
          if (meuPerfil) idAtivo = meuPerfil.academia_id;
        } else {
          // Se for Admin ou se acabou de deslogar, força a leitura da memória do navegador!
          // Isso ignora completamente a academia "suja" que o aluno deixou na memória temporária do React
          const memoriaAdmin = store.get("osstrack_admin_academia");
          idAtivo = memoriaAdmin?.id || (academiasData && academiasData.length > 0 ? academiasData[0].id : null);
        }
      }
      // ───────────────────────────────────────────────────────────

      if (idAtivo && Array.isArray(academiasData)) {
        const novaAtual = academiasData.find(a => a.id === idAtivo);
        if (novaAtual) setAcademiaAtual(novaAtual);
      }

      // Se não tem academia nenhuma no banco, encerra a busca com a tela limpa
      if (!idAtivo) {
         setTurmas([]);
         setAlunos([]);
         setDbStatus("ok");
         return;
      }

      // 3. Busca Turmas filtrando por Academia
      const turmasData = await db.get("turmas", `?academia_id=eq.${idAtivo}&order=created_at`);
      if (!Array.isArray(turmasData)) throw new Error(turmasData?.message || "Erro nas turmas");
      setTurmas(turmasData);

      // 4. Filtra localmente os alunos apenas para a Academia Ativa (Painel Admin)
      const alunosDaAcademia = listaGlobal.filter(a => a.academia_id === idAtivo);
      setAlunos(alunosDaAcademia); 
      
      setDbStatus("ok");
    } catch (e) {
      setDbErro(e.message);
      setDbStatus("error");
    }
  };

  // Roda assim que o app liga E sempre que alguém fizer Login/Logout
  useEffect(() => { 
    carregarBanco(); 
  }, [session?.role, session?.alunoId]);

  const alunoLogado = session?.role === "aluno" ? todosAlunos.find((a) => a.id === session.alunoId) : null;

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <DbStatusBar status={dbStatus} turmasCount={turmas.length} erro={dbErro} />
        {!session ? (
          <Login onLogin={setSession} todosAlunos={todosAlunos} />
        ) : (
          <>
            <nav className="topnav">
              <div className="nav-logo">OSS<span>.</span>TRACK</div>
              <div className="nav-right">
                
                {/* MENU DE ACADEMIAS */}
                {session.role === "admin" && academias.length > 0 && (
                  <select 
                    className="academy-select"
                    value={academiaAtual?.id || ""} 
                    onChange={(e) => {
                      const nova = academias.find(a => a.id === e.target.value);
                      setAcademiaAtual(nova);
                      carregarBanco(nova.id); // Força a buscar os dados da nova unidade na hora
                    }}
                  >
                    {academias.map(a => (
                      <option key={a.id} value={a.id}>{a.nome}</option>
                    ))}
                  </select>
                )}

                <span className="nav-user">{session.username} · {session.role === "admin" ? "Admin" : "Aluno"}</span>
                <button className="btn-logout" onClick={() => setSession(null)}>Sair</button>
              </div>
            </nav>
            {session.role === "admin"
              ? <AdminView turmas={turmas} alunos={alunos} carregarBanco={carregarBanco} academiaAtual={academiaAtual} />
              : <AlunoView aluno={alunoLogado} turmas={turmas} carregarBanco={carregarBanco} />
            }
          </>
        )}
      </div>
    </>
  );
}