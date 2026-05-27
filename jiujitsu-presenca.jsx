import { useState, useEffect } from "react";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SB_URL = "https://yultwpihlrrgzelkyidv.supabase.co";
const SB_KEY = "sb_publishable_IYTw-lZ4vYqIW1n-VBe7iA_b833hsHo";

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

// ─── MOCK DATA (ainda usados enquanto alunos/presenças não vêm do banco) ──────
const generatePresencas = (alunoId, turmas) => {
  const base = [];
  const hoje = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() - i);
    const diaSemana = d.getDay();
    if (diaSemana === 0 || diaSemana === 6) continue;
    const chance = alunoId % 3 === 0 ? 0.65 : alunoId % 3 === 1 ? 0.85 : 0.75;
    if (Math.random() < chance) {
      base.push({
        data: d.toISOString().split("T")[0],
        turma: turmas[alunoId % turmas.length]?.nome || "—",
        hora: `${19 + (alunoId % 2)}:${String(Math.floor(Math.random() * 30)).padStart(2, "0")}`,
      });
    }
  }
  return base;
};

const buildMockAlunos = (turmas) => [
  { id: 1, nome: "Carlos Mendes", faixa: "Roxa", turma: 3, foto: "CM" },
  { id: 2, nome: "Beatriz Souza", faixa: "Azul", turma: 2, foto: "BS" },
  { id: 3, nome: "Rafael Lima", faixa: "Branca", turma: 2, foto: "RL" },
  { id: 4, nome: "Juliana Torres", faixa: "Marrom", turma: 3, foto: "JT" },
  { id: 5, nome: "Pedro Alves", faixa: "Azul", turma: 1, foto: "PA" },
  { id: 6, nome: "Fernanda Costa", faixa: "Branca", turma: 1, foto: "FC" },
  { id: 7, nome: "Diego Rocha", faixa: "Preta", turma: 3, foto: "DR" },
  { id: 8, nome: "Amanda Neves", faixa: "Roxa", turma: 2, foto: "AN" },
].map((a) => ({ ...a, presencas: generatePresencas(a.id, turmas) }));

const FAIXA_COLORS = {
  Branca: "#e5e5e5", Azul: "#3b82f6", Roxa: "#8b5cf6",
  Marrom: "#92400e", Preta: "#1a1a1a",
};

const TODAY = new Date().toISOString().split("T")[0];

const LOGINS = {
  admin: { senha: "admin123", role: "admin" },
  carlos: { senha: "123", role: "aluno", alunoId: 1 },
  beatriz: { senha: "123", role: "aluno", alunoId: 2 },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const calcFreq = (aluno) => {
  const total = 22;
  const presentes = aluno.presencas.length;
  return { presentes, total, pct: Math.round((presentes / total) * 100) };
};

const getAulaHoje = (turmas) => {
  const dia = new Date().getDay();
  if (dia === 1 || dia === 3 || dia === 5) return turmas[2];
  if (dia === 2 || dia === 4) return turmas[1];
  return null;
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0a0a0a; --surface: #141414; --surface2: #1e1e1e;
    --border: #2a2a2a; --red: #dc2626; --red-dim: #7f1d1d;
    --gold: #d97706; --text: #f0f0f0; --muted: #6b6b6b;
    --green: #16a34a; --radius: 12px;
  }
  body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; min-height: 100vh; }
  .app { min-height: 100vh; display: flex; flex-direction: column; }

  /* DB STATUS BAR */
  .db-bar {
    padding: 7px 20px; font-size: 0.75rem; display: flex; align-items: center;
    gap: 8px; border-bottom: 1px solid var(--border);
  }
  .db-bar.ok { background: #052e16; color: #4ade80; }
  .db-bar.err { background: #450a0a; color: #f87171; }
  .db-bar.loading { background: #1c1400; color: #fbbf24; }
  .db-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
  .db-bar.ok .db-dot { animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

  /* LOGIN */
  .login-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: radial-gradient(ellipse at 60% 20%, #1a0000 0%, #0a0a0a 70%); padding: 24px;
  }
  .login-card {
    width: 100%; max-width: 420px; background: var(--surface); border: 1px solid var(--border);
    border-radius: 16px; padding: 40px 36px; position: relative; overflow: hidden;
  }
  .login-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--red); }
  .login-logo { font-family: 'Bebas Neue', sans-serif; font-size: 2.6rem; letter-spacing: 3px; color: var(--text); line-height: 1; }
  .login-logo span { color: var(--red); }
  .login-sub { color: var(--muted); font-size: 0.85rem; margin-top: 4px; margin-bottom: 32px; }
  .input-group { margin-bottom: 16px; }
  .input-group label { display: block; font-size: 0.78rem; font-weight: 500; color: var(--muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; }
  .input-group input {
    width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
    padding: 12px 14px; color: var(--text); font-size: 0.95rem; font-family: inherit; transition: border-color 0.2s;
  }
  .input-group input:focus { outline: none; border-color: var(--red); }
  .btn-primary {
    width: 100%; background: var(--red); color: white; border: none; padding: 13px;
    border-radius: 8px; font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; letter-spacing: 2px;
    cursor: pointer; transition: opacity 0.2s, transform 0.1s; margin-top: 8px;
  }
  .btn-primary:hover { opacity: 0.9; }
  .btn-primary:active { transform: scale(0.98); }
  .login-hint { color: var(--muted); font-size: 0.78rem; margin-top: 20px; text-align: center; line-height: 1.6; }
  .err { color: #f87171; font-size: 0.82rem; margin-top: 8px; }

  /* TOPNAV */
  .topnav {
    background: var(--surface); border-bottom: 1px solid var(--border);
    padding: 0 20px; display: flex; align-items: center; justify-content: space-between;
    height: 56px; position: sticky; top: 0; z-index: 100;
  }
  .nav-logo { font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem; letter-spacing: 2px; }
  .nav-logo span { color: var(--red); }
  .nav-tabs { display: flex; gap: 4px; }
  .nav-tab {
    background: none; border: none; color: var(--muted); font-family: inherit;
    font-size: 0.82rem; font-weight: 500; padding: 6px 12px; border-radius: 6px; cursor: pointer; transition: all 0.15s;
  }
  .nav-tab.active { background: var(--red); color: white; }
  .nav-tab:hover:not(.active) { background: var(--border); color: var(--text); }
  .nav-right { display: flex; align-items: center; gap: 12px; }
  .nav-user { font-size: 0.82rem; color: var(--muted); }
  .btn-logout {
    background: var(--border); border: none; color: var(--muted); font-family: inherit;
    font-size: 0.78rem; padding: 5px 10px; border-radius: 6px; cursor: pointer; transition: all 0.15s;
  }
  .btn-logout:hover { background: var(--red-dim); color: white; }

  /* MAIN */
  .main { flex: 1; padding: 24px 20px; max-width: 1100px; margin: 0 auto; width: 100%; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }

  /* STAT */
  .stat-card { display: flex; flex-direction: column; gap: 6px; }
  .stat-label { font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }
  .stat-value { font-family: 'Bebas Neue', sans-serif; font-size: 2.2rem; line-height: 1; }
  .stat-value.red { color: var(--red); } .stat-value.green { color: var(--green); } .stat-value.gold { color: var(--gold); }
  .stat-sub { font-size: 0.78rem; color: var(--muted); }

  /* TABLE */
  .section-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.2rem; letter-spacing: 2px; margin-bottom: 16px; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
  th { text-align: left; padding: 10px 14px; color: var(--muted); font-weight: 500; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid var(--border); }
  td { padding: 12px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--surface2); }

  /* BADGES */
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 500; }
  .badge-presente { background: #14532d; color: #4ade80; }
  .badge-falta { background: #450a0a; color: #f87171; }
  .badge-faixa { display: inline-block; width: 32px; height: 8px; border-radius: 2px; border: 1px solid rgba(255,255,255,0.1); }

  /* AVATAR */
  .avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; flex-shrink: 0; }

  /* PROGRESS */
  .prog-bar { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
  .prog-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }

  /* ALUNO VIEW */
  .aluno-hero {
    background: linear-gradient(135deg, #1a0000 0%, var(--surface) 60%);
    border: 1px solid var(--border); border-radius: 16px; padding: 28px;
    margin-bottom: 24px; display: flex; align-items: center; gap: 24px; position: relative; overflow: hidden;
  }
  .aluno-hero::after {
    content: 'BJJ'; position: absolute; right: -10px; top: 50%; transform: translateY(-50%);
    font-family: 'Bebas Neue', sans-serif; font-size: 7rem; color: rgba(255,255,255,0.03); letter-spacing: 4px; pointer-events: none;
  }
  .aluno-avatar {
    width: 72px; height: 72px; border-radius: 50%; background: var(--red);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Bebas Neue', sans-serif; font-size: 1.6rem; letter-spacing: 1px; flex-shrink: 0;
  }
  .aluno-nome { font-family: 'Bebas Neue', sans-serif; font-size: 1.8rem; letter-spacing: 2px; }
  .aluno-meta { font-size: 0.83rem; color: var(--muted); margin-top: 2px; }

  /* CHECKIN */
  .checkin-zone { text-align: center; padding: 32px 0; }
  .checkin-btn {
    width: 180px; height: 180px; border-radius: 50%;
    background: radial-gradient(circle at 40% 35%, #3a0000, #1a0000);
    border: 2px solid var(--red); color: white; cursor: pointer;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
    transition: all 0.25s; box-shadow: 0 0 40px rgba(220,38,38,0.2); font-family: inherit;
  }
  .checkin-btn:hover { box-shadow: 0 0 60px rgba(220,38,38,0.4); transform: scale(1.05); }
  .checkin-btn.done { background: radial-gradient(circle at 40% 35%, #003a00, #001a00); border-color: var(--green); box-shadow: 0 0 40px rgba(22,163,74,0.2); }
  .checkin-btn.done:hover { box-shadow: 0 0 60px rgba(22,163,74,0.4); }
  .checkin-icon { font-size: 2.4rem; }
  .checkin-text { font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; letter-spacing: 2px; }
  .checkin-sub { font-size: 0.75rem; color: var(--muted); }
  .aula-info { margin-top: 16px; font-size: 0.83rem; color: var(--muted); }
  .aula-info strong { color: var(--text); }

  /* HISTÓRICO GRID */
  .hist-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
  .hist-day { aspect-ratio: 1; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; color: var(--muted); transition: transform 0.15s; }
  .hist-day.presente { background: #14532d; color: #4ade80; font-weight: 600; }
  .hist-day.falta { background: var(--surface2); }
  .hist-day:hover { transform: scale(1.15); }
  .hist-legend { display: flex; gap: 16px; margin-top: 12px; font-size: 0.75rem; color: var(--muted); }
  .hist-legend span { display: flex; align-items: center; gap: 6px; }
  .dot { width: 10px; height: 10px; border-radius: 2px; }

  /* ADMIN */
  .page-header { margin-bottom: 24px; }
  .page-header h1 { font-family: 'Bebas Neue', sans-serif; font-size: 2rem; letter-spacing: 3px; }
  .page-header p { color: var(--muted); font-size: 0.85rem; margin-top: 2px; }
  .filters { display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; }
  .filter-btn { background: var(--surface2); border: 1px solid var(--border); color: var(--muted); font-family: inherit; font-size: 0.8rem; padding: 6px 14px; border-radius: 20px; cursor: pointer; transition: all 0.15s; }
  .filter-btn.active { background: var(--red); border-color: var(--red); color: white; }

  /* DETAIL PANEL */
  .detail-panel {
    position: fixed; right: 0; top: 0; bottom: 0; width: 360px;
    background: var(--surface); border-left: 1px solid var(--border);
    padding: 24px; z-index: 200; overflow-y: auto; animation: slideIn 0.25s ease;
  }
  @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 199; }
  .btn-close { background: var(--border); border: none; color: var(--text); width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center; }
  .detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .hoje-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); }
  .hoje-item:last-child { border-bottom: none; }

  /* TURMAS CARD */
  .turma-card {
    background: var(--surface2); border: 1px solid var(--border); border-radius: 10px;
    padding: 16px; display: flex; align-items: center; gap: 14px;
  }
  .turma-icon { font-size: 1.6rem; }
  .turma-nome { font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; letter-spacing: 1px; }
  .turma-meta { font-size: 0.78rem; color: var(--muted); margin-top: 2px; }
  .turma-badge { margin-left: auto; background: var(--red-dim); color: #f87171; padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; }

  /* LOADING */
  .skeleton { background: linear-gradient(90deg, var(--surface2) 25%, var(--border) 50%, var(--surface2) 75%); background-size: 200%; animation: shimmer 1.4s infinite; border-radius: 6px; }
  @keyframes shimmer { 0%{background-position:200%} 100%{background-position:-200%} }

  @media (max-width: 720px) {
    .grid-4 { grid-template-columns: repeat(2, 1fr); }
    .grid-2 { grid-template-columns: 1fr; }
    .detail-panel { width: 100%; }
  }
  @media (max-width: 480px) {
    .nav-tabs { display: none; }
  }
`;

// ─── DB STATUS BAR ─────────────────────────────────────────────────────────────
function DbStatusBar({ status, turmasCount, erro }) {
  if (status === "loading") return (
    <div className="db-bar loading"><div className="db-dot" />Conectando ao Supabase…</div>
  );
  if (status === "error") return (
    <div className="db-bar err"><div className="db-dot" />Erro na conexão: {erro}</div>
  );
  return (
    <div className="db-bar ok">
      <div className="db-dot" />
      Supabase conectado · {turmasCount} turmas carregadas do banco
    </div>
  );
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  const handle = () => {
    const found = LOGINS[user.toLowerCase()];
    if (found && found.senha === pass) onLogin({ username: user, ...found });
    else setErr("Usuário ou senha incorretos.");
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">OSS<span>.</span>TRACK</div>
        <div className="login-sub">Sistema de Presença — BJJ</div>
        <div className="input-group">
          <label>Usuário</label>
          <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="carlos / admin" onKeyDown={(e) => e.key === "Enter" && handle()} />
        </div>
        <div className="input-group">
          <label>Senha</label>
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••" onKeyDown={(e) => e.key === "Enter" && handle()} />
        </div>
        {err && <div className="err">{err}</div>}
        <button className="btn-primary" onClick={handle}>ENTRAR</button>
        <div className="login-hint">Demo: <strong>admin / admin123</strong> &nbsp;|&nbsp; <strong>carlos / 123</strong></div>
      </div>
    </div>
  );
}

// ─── ALUNO VIEW ────────────────────────────────────────────────────────────────
function AlunoView({ aluno, turmas }) {
  const [checkedIn, setCheckedIn] = useState(aluno.presencas.some((p) => p.data === TODAY));
  const [presencas, setPresencas] = useState(aluno.presencas);
  const aulaHoje = getAulaHoje(turmas);
  const freq = calcFreq({ ...aluno, presencas });

  const doCheckin = () => {
    if (checkedIn || !aulaHoje) return;
    const now = new Date();
    const hora = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setPresencas([...presencas, { data: TODAY, turma: aulaHoje.nome, hora }]);
    setCheckedIn(true);
  };

  const days = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const diaSemana = d.getDay();
    days.push({ key, presente: presencas.some((p) => p.data === key), temAula: diaSemana !== 0 && diaSemana !== 6, label: String(d.getDate()) });
  }

  const turmaAluno = turmas.find((t) => t.id === aluno.turma);

  return (
    <div className="main">
      <div className="aluno-hero">
        <div className="aluno-avatar">{aluno.foto}</div>
        <div>
          <div className="aluno-nome">{aluno.nome}</div>
          <div className="aluno-meta">
            Faixa <span style={{ color: FAIXA_COLORS[aluno.faixa] || "#ccc" }}>{aluno.faixa}</span>
            &nbsp;·&nbsp;{turmaAluno?.nome || "—"}
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
            <button className={`checkin-btn ${checkedIn ? "done" : ""}`} onClick={doCheckin}>
              <span className="checkin-icon">{checkedIn ? "✓" : "👊"}</span>
              <span className="checkin-text">{checkedIn ? "PRESENTE!" : "CHECK-IN"}</span>
              <span className="checkin-sub">{checkedIn ? "Oss! Boa aula!" : "Toque para marcar"}</span>
            </button>
            <div className="aula-info">
              {aulaHoje ? <>Aula hoje: <strong>{aulaHoje.nome}</strong> · {aulaHoje.horario}</> : "Sem aula hoje 🥋"}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-title">Últimos 28 Dias</div>
          <div className="hist-grid">
            {days.map((d) => (
              <div key={d.key} className={`hist-day ${d.presente ? "presente" : d.temAula ? "falta" : ""}`} title={d.key}>{d.label}</div>
            ))}
          </div>
          <div className="hist-legend">
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
        <div className="table-wrap">
          <table>
            <thead><tr><th>Data</th><th>Turma</th><th>Hora</th><th>Status</th></tr></thead>
            <tbody>
              {[...presencas].reverse().slice(0, 8).map((p, i) => (
                <tr key={i}>
                  <td>{new Date(p.data + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                  <td>{p.turma}</td>
                  <td>{p.hora}</td>
                  <td><span className="badge badge-presente">Presente</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN VIEW ────────────────────────────────────────────────────────────────
function AdminView({ turmas, alunos }) {
  const [tab, setTab] = useState("dashboard");
  const [filtroTurma, setFiltroTurma] = useState("Todas");
  const [detalhe, setDetalhe] = useState(null);

  const presencasHoje = alunos.filter((a) => a.presencas.some((p) => p.data === TODAY));
  const faltasHoje = alunos.length - presencasHoje.length;
  const freqMedia = alunos.length ? Math.round(alunos.reduce((s, a) => s + calcFreq(a).pct, 0) / alunos.length) : 0;
  const emRisco = alunos.filter((a) => calcFreq(a).pct < 70).length;
  const alunosFiltrados = filtroTurma === "Todas" ? alunos : alunos.filter((a) => turmas.find((t) => t.id === a.turma)?.nome === filtroTurma);

  return (
    <div className="main">
      {detalhe && (
        <>
          <div className="overlay" onClick={() => setDetalhe(null)} />
          <div className="detail-panel">
            <div className="detail-header">
              <strong style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.1rem", letterSpacing: "1px" }}>FICHA DO ALUNO</strong>
              <button className="btn-close" onClick={() => setDetalhe(null)}>✕</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
              <div className="avatar" style={{ background: "var(--red)", width: 50, height: 50, fontSize: "1rem" }}>{detalhe.foto}</div>
              <div>
                <div style={{ fontWeight: 600 }}>{detalhe.nome}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Faixa <span style={{ color: FAIXA_COLORS[detalhe.faixa] }}>{detalhe.faixa}</span></div>
              </div>
            </div>
            {(() => {
              const f = calcFreq(detalhe);
              return (
                <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
                  {[{ v: `${f.pct}%`, l: "frequência", c: f.pct >= 75 ? "var(--green)" : "var(--red)" }, { v: f.presentes, l: "presenças", c: "var(--green)" }, { v: f.total - f.presentes, l: "faltas", c: "var(--red)" }].map((s) => (
                    <div key={s.l} className="card" style={{ flex: 1, padding: "12px", textAlign: "center" }}>
                      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", color: s.c }}>{s.v}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "0.9rem", letterSpacing: "1px", color: "var(--muted)", marginBottom: "10px" }}>ÚLTIMAS PRESENÇAS</div>
            {[...detalhe.presencas].reverse().slice(0, 10).map((p, i) => (
              <div key={i} className="hoje-item">
                <span className="badge badge-presente">✓</span>
                <span style={{ fontSize: "0.85rem" }}>{new Date(p.data + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                <span style={{ fontSize: "0.78rem", color: "var(--muted)", marginLeft: "auto" }}>{p.turma} · {p.hora}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="page-header">
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {["dashboard", "turmas", "alunos", "hoje"].map((t) => (
            <button key={t} className={`filter-btn ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t === "dashboard" ? "📊 Dashboard" : t === "turmas" ? "🏋️ Turmas" : t === "alunos" ? "🥋 Alunos" : "📋 Hoje"}
            </button>
          ))}
        </div>
        <h1>{tab === "dashboard" ? "Dashboard" : tab === "turmas" ? "Turmas" : tab === "alunos" ? "Alunos" : "Presenças de Hoje"}</h1>
        <p>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      </div>

      {tab === "dashboard" && (
        <>
          <div className="grid-4">
            <div className="card stat-card"><div className="stat-label">Presentes Hoje</div><div className="stat-value green">{presencasHoje.length}</div><div className="stat-sub">de {alunos.length} alunos</div></div>
            <div className="card stat-card"><div className="stat-label">Faltas Hoje</div><div className="stat-value red">{faltasHoje}</div><div className="stat-sub">{alunos.length ? Math.round((faltasHoje / alunos.length) * 100) : 0}% ausentes</div></div>
            <div className="card stat-card"><div className="stat-label">Freq. Média</div><div className="stat-value gold">{freqMedia}%</div><div className="stat-sub">últimos 30 dias</div></div>
            <div className="card stat-card"><div className="stat-label">Em Risco</div><div className="stat-value red">{emRisco}</div><div className="stat-sub">abaixo de 70%</div></div>
          </div>
          <div className="grid-2">
            <div className="card">
              <div className="section-title">Frequência por Aluno</div>
              {alunos.map((a) => {
                const f = calcFreq(a);
                return (
                  <div key={a.id} style={{ marginBottom: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px", fontSize: "0.83rem" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className="badge-faixa" style={{ background: FAIXA_COLORS[a.faixa], border: "1px solid rgba(255,255,255,0.15)" }} />
                        {a.nome}
                      </span>
                      <span style={{ color: f.pct >= 75 ? "var(--green)" : "var(--red)", fontWeight: 600 }}>{f.pct}%</span>
                    </div>
                    <div className="prog-bar"><div className="prog-fill" style={{ width: `${f.pct}%`, background: f.pct >= 75 ? "var(--green)" : f.pct >= 60 ? "var(--gold)" : "var(--red)" }} /></div>
                  </div>
                );
              })}
            </div>
            <div className="card">
              <div className="section-title">Alunos em Risco ⚠️</div>
              {alunos.filter((a) => calcFreq(a).pct < 75).map((a) => {
                const f = calcFreq(a);
                return (
                  <div key={a.id} className="hoje-item" style={{ cursor: "pointer" }} onClick={() => setDetalhe(a)}>
                    <div className="avatar" style={{ background: "var(--red-dim)", fontSize: "0.7rem" }}>{a.foto}</div>
                    <div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 500 }}>{a.nome}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{f.total - f.presentes} faltas · {turmas.find((t) => t.id === a.turma)?.nome}</div>
                    </div>
                    <span className="badge badge-falta" style={{ marginLeft: "auto" }}>{f.pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {tab === "turmas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "4px" }}>
            {turmas.length} turmas carregadas do Supabase ✓
          </div>
          {turmas.map((t) => {
            const qAlunos = alunos.filter((a) => a.turma === t.id).length;
            return (
              <div key={t.id} className="turma-card">
                <div className="turma-icon">🥋</div>
                <div>
                  <div className="turma-nome">{t.nome}</div>
                  <div className="turma-meta">{t.horario} &nbsp;·&nbsp; {t.dias}</div>
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", color: "var(--gold)" }}>{qAlunos}</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>alunos</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "alunos" && (
        <div className="card">
          <div className="filters">
            {["Todas", ...turmas.map((t) => t.nome)].map((t) => (
              <button key={t} className={`filter-btn ${filtroTurma === t ? "active" : ""}`} onClick={() => setFiltroTurma(t)}>{t}</button>
            ))}
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Aluno</th><th>Faixa</th><th>Turma</th><th>Presenças</th><th>Faltas</th><th>Frequência</th></tr></thead>
              <tbody>
                {alunosFiltrados.map((a) => {
                  const f = calcFreq(a);
                  return (
                    <tr key={a.id} style={{ cursor: "pointer" }} onClick={() => setDetalhe(a)}>
                      <td><div style={{ display: "flex", alignItems: "center", gap: "10px" }}><div className="avatar" style={{ background: "var(--red-dim)", fontSize: "0.7rem" }}>{a.foto}</div>{a.nome}</div></td>
                      <td><span style={{ display: "flex", alignItems: "center", gap: "7px" }}><span className="badge-faixa" style={{ background: FAIXA_COLORS[a.faixa] }} />{a.faixa}</span></td>
                      <td style={{ color: "var(--muted)" }}>{turmas.find((t) => t.id === a.turma)?.nome}</td>
                      <td style={{ color: "var(--green)", fontWeight: 600 }}>{f.presentes}</td>
                      <td style={{ color: "var(--red)", fontWeight: 600 }}>{f.total - f.presentes}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div className="prog-bar" style={{ flex: 1 }}><div className="prog-fill" style={{ width: `${f.pct}%`, background: f.pct >= 75 ? "var(--green)" : f.pct >= 60 ? "var(--gold)" : "var(--red)" }} /></div>
                          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: f.pct >= 75 ? "var(--green)" : "var(--red)", minWidth: "36px", textAlign: "right" }}>{f.pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "hoje" && (
        <div className="grid-2">
          <div className="card">
            <div className="section-title" style={{ color: "var(--green)" }}>✓ Presentes ({presencasHoje.length})</div>
            {presencasHoje.map((a) => {
              const p = a.presencas.find((x) => x.data === TODAY);
              return (
                <div key={a.id} className="hoje-item">
                  <div className="avatar" style={{ background: "#14532d", color: "#4ade80", fontSize: "0.7rem" }}>{a.foto}</div>
                  <div><div style={{ fontSize: "0.88rem", fontWeight: 500 }}>{a.nome}</div><div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{p?.turma} · {p?.hora}</div></div>
                  <span className="badge-faixa" style={{ marginLeft: "auto", background: FAIXA_COLORS[a.faixa] }} />
                </div>
              );
            })}
          </div>
          <div className="card">
            <div className="section-title" style={{ color: "var(--red)" }}>✗ Ausentes ({faltasHoje})</div>
            {alunos.filter((a) => !a.presencas.some((p) => p.data === TODAY)).map((a) => (
              <div key={a.id} className="hoje-item">
                <div className="avatar" style={{ background: "#450a0a", color: "#f87171", fontSize: "0.7rem" }}>{a.foto}</div>
                <div><div style={{ fontSize: "0.88rem", fontWeight: 500 }}>{a.nome}</div><div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{turmas.find((t) => t.id === a.turma)?.nome}</div></div>
                <span className="badge-faixa" style={{ marginLeft: "auto", background: FAIXA_COLORS[a.faixa] }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [turmas, setTurmas] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [dbStatus, setDbStatus] = useState("loading");
  const [dbErro, setDbErro] = useState("");

  // Carrega turmas do Supabase ao iniciar
  useEffect(() => {
    async function carregarBanco() {
      try {
        setDbStatus("loading");
        
        // 1. Busca as turmas
        const turmasData = await db.get("turmas", "?order=created_at");
        if (!Array.isArray(turmasData)) throw new Error(turmasData?.message || "Erro nas turmas");
        setTurmas(turmasData);

        // 2. Busca os alunos já trazendo o histórico de presenças atrelado a eles
        const alunosData = await db.get("alunos", "?select=*,presencas(*)&order=nome");
        if (!Array.isArray(alunosData)) throw new Error(alunosData?.message || "Erro nos alunos");
        setAlunos(alunosData);

        setDbStatus("ok");
      } catch (e) {
        setDbErro(e.message);
        setDbStatus("error");
        
        // Se falhar, tenta manter o mock apenas para o app não quebrar na tela
        const mockTurmas = [
          { id: 1, nome: "Manhã", horario: "07:00 – 08:30", dias: "Seg / Qua / Sex" },
          { id: 2, nome: "Noite Iniciante", horario: "19:00 – 20:30", dias: "Ter / Qui" },
        ];
        setTurmas(mockTurmas);
        setAlunos(buildMockAlunos(mockTurmas));
      }
    }

    carregarBanco();
  }, []);

  const aluno = session?.role === "aluno" ? alunos.find((a) => a.id === session.alunoId) : null;

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <DbStatusBar status={dbStatus} turmasCount={turmas.length} erro={dbErro} />
        {!session ? (
          <Login onLogin={setSession} />
        ) : (
          <>
            <nav className="topnav">
              <div className="nav-logo">OSS<span>.</span>TRACK</div>
              <div className="nav-right">
                <span className="nav-user">{session.username} · {session.role === "admin" ? "Admin" : aluno?.faixa}</span>
                <button className="btn-logout" onClick={() => setSession(null)}>Sair</button>
              </div>
            </nav>
            {session.role === "admin"
              ? <AdminView turmas={turmas} alunos={alunos} />
              : aluno ? <AlunoView aluno={aluno} turmas={turmas} /> : <div className="main"><p style={{color:"var(--muted)"}}>Carregando…</p></div>
            }
          </>
        )}
      </div>
    </>
  );
}
