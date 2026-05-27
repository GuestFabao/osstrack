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

const FAIXA_COLORS = {
  Branca: "#e5e5e5", Azul: "#3b82f6", Roxa: "#8b5cf6",
  Marrom: "#92400e", Preta: "#1a1a1a",
};

const TODAY = new Date().toISOString().split("T")[0];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const calcFreq = (aluno) => {
  const presencas = aluno.presencas?.length || 0;
  const totalDiasVisiveis = 30; // Visão de 30 dias
  return { 
    presentes: presencas, 
    total: totalDiasVisiveis, 
    pct: Math.round((presencas / totalDiasVisiveis) * 100) 
  };
};

const getIniciais = (nome) => {
  if (!nome) return "—";
  return nome.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
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
  .db-bar { padding: 7px 20px; font-size: 0.75rem; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--border); }
  .db-bar.ok { background: #052e16; color: #4ade80; }
  .db-bar.err { background: #450a0a; color: #f87171; }
  .db-bar.loading { background: #1c1400; color: #fbbf24; }
  .db-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
  .db-bar.ok .db-dot { animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

  /* GERAIS */
  .main { flex: 1; padding: 24px 20px; max-width: 1100px; margin: 0 auto; width: 100%; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }
  .section-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.2rem; letter-spacing: 2px; margin-bottom: 16px; }

  /* LOGIN & FORMS */
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
  .btn-danger { width: 100%; background: #450a0a; color: #f87171; border: 1px solid var(--red-dim); padding: 13px; border-radius: 8px; font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; letter-spacing: 2px; cursor: pointer; transition: all 0.2s; }
  .btn-danger:hover { background: #7f1d1d; color: white; }
  
  /* MODAL */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 299; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .modal-box { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 420px; padding: 28px; position: relative; animation: slideUp 0.2s ease; }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .modal-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.6rem; letter-spacing: 2px; margin-bottom: 20px; }
  .btn-close { position: absolute; top: 20px; right: 20px; background: none; border: none; color: var(--muted); cursor: pointer; font-size: 1.2rem; }

  /* TOPNAV */
  .topnav { background: var(--surface); border-bottom: 1px solid var(--border); padding: 0 20px; display: flex; align-items: center; justify-content: space-between; height: 56px; position: sticky; top: 0; z-index: 100; }
  .nav-logo { font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem; letter-spacing: 2px; }
  .nav-logo span { color: var(--red); }
  .nav-right { display: flex; align-items: center; gap: 12px; }
  .nav-user { font-size: 0.82rem; color: var(--muted); }
  .btn-logout { background: var(--border); border: none; color: var(--muted); font-family: inherit; font-size: 0.78rem; padding: 5px 10px; border-radius: 6px; cursor: pointer; transition: all 0.15s; }
  .btn-logout:hover { background: var(--red-dim); color: white; }

  /* ADMIN HEADER & FILTERS */
  .page-header { margin-bottom: 24px; }
  .page-header h1 { font-family: 'Bebas Neue', sans-serif; font-size: 2rem; letter-spacing: 3px; }
  .page-header p { color: var(--muted); font-size: 0.85rem; margin-top: 2px; }
  .filters { display: flex; gap: 10px; flex-wrap: wrap; }
  .filter-btn { background: var(--surface2); border: 1px solid var(--border); color: var(--muted); font-family: inherit; font-size: 0.8rem; padding: 6px 14px; border-radius: 20px; cursor: pointer; transition: all 0.15s; }
  .filter-btn.active { background: var(--red); border-color: var(--red); color: white; }

  /* TABLE & BADGES */
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
  th { text-align: left; padding: 10px 14px; color: var(--muted); font-weight: 500; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid var(--border); }
  td { padding: 12px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--surface2); }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 500; }
  .badge-presente { background: #14532d; color: #4ade80; }
  .badge-faixa { display: inline-block; width: 32px; height: 8px; border-radius: 2px; border: 1px solid rgba(255,255,255,0.1); }
  .avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; flex-shrink: 0; background: var(--red-dim); }

  /* STAT CARDS */
  .stat-card { display: flex; flex-direction: column; gap: 6px; }
  .stat-label { font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }
  .stat-value { font-family: 'Bebas Neue', sans-serif; font-size: 2.2rem; line-height: 1; }
  .stat-value.red { color: var(--red); } .stat-value.green { color: var(--green); } .stat-value.gold { color: var(--gold); }
  .stat-sub { font-size: 0.78rem; color: var(--muted); }

  /* PROGRESS BAR */
  .prog-bar { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
  .prog-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }

  /* DETAIL PANEL & HOJE TAB ITEMS */
  .detail-panel { position: fixed; right: 0; top: 0; bottom: 0; width: 360px; background: var(--surface); border-left: 1px solid var(--border); padding: 24px; z-index: 200; overflow-y: auto; animation: slideIn 0.25s ease; display: flex; flex-direction: column; }
  @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
  .hoje-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.15s; }
  .hoje-item:hover { background: var(--surface2); }
  .hoje-item:last-child { border-bottom: none; }

  /* ALUNO VIEW */
  .aluno-hero { background: linear-gradient(135deg, #1a0000 0%, var(--surface) 60%); border: 1px solid var(--border); border-radius: 16px; padding: 28px; margin-bottom: 24px; display: flex; align-items: center; gap: 24px; position: relative; overflow: hidden; }
  .aluno-hero::after { content: 'BJJ'; position: absolute; right: -10px; top: 50%; transform: translateY(-50%); font-family: 'Bebas Neue', sans-serif; font-size: 7rem; color: rgba(255,255,255,0.03); letter-spacing: 4px; pointer-events: none; }
  .aluno-avatar { width: 72px; height: 72px; border-radius: 50%; background: var(--red); display: flex; align-items: center; justify-content: center; font-family: 'Bebas Neue', sans-serif; font-size: 1.6rem; letter-spacing: 1px; flex-shrink: 0; }
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

  /* HISTÓRICO GRID */
  .hist-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
  .hist-day { aspect-ratio: 1; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; color: var(--muted); transition: transform 0.15s; }
  .hist-day.presente { background: #14532d; color: #4ade80; font-weight: 600; }
  .hist-day.falta { background: var(--surface2); }
  .hist-day:hover { transform: scale(1.15); }
  .hist-legend { display: flex; gap: 16px; margin-top: 12px; font-size: 0.75rem; color: var(--muted); }
  .hist-legend span { display: flex; align-items: center; gap: 6px; }
  .dot { width: 10px; height: 10px; border-radius: 2px; }

  @media (max-width: 720px) { .grid-4 { grid-template-columns: repeat(2, 1fr); } .grid-2 { grid-template-columns: 1fr; } .detail-panel { width: 100%; } }
`;

// ─── DB STATUS BAR ─────────────────────────────────────────────────────────────
function DbStatusBar({ status, turmasCount, erro }) {
  if (status === "loading") return <div className="db-bar loading"><div className="db-dot" />Conectando ao Supabase…</div>;
  if (status === "error") return <div className="db-bar err"><div className="db-dot" />Erro: {erro}</div>;
  return <div className="db-bar ok"><div className="db-dot" />Supabase conectado · {turmasCount} turmas carregadas</div>;
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────────
function Login({ onLogin, alunos }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  const handle = () => {
    // 1. Tenta logar como Admin
    if (user.toLowerCase() === "admin" && pass === "admin123") {
      onLogin({ username: "Admin", role: "admin" });
      return;
    }
    
    // 2. Tenta logar como Aluno Real do Banco
    const alunoEncontrado = alunos.find(a => a.nome.toLowerCase() === user.toLowerCase());
    if (alunoEncontrado && pass === "123") {
      onLogin({ username: alunoEncontrado.nome, role: "aluno", alunoId: alunoEncontrado.id });
      return;
    }

    alert("Credenciais inválidas.\n\nPara Admin: admin / admin123\nPara Aluno: Digite o Nome Completo / Senha: 123");
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">OSS<span>.</span>TRACK</div>
        <div className="login-sub" style={{marginBottom:"32px"}}>Sistema de Presença — BJJ</div>
        <div className="input-group">
          <label>Usuário (Admin ou Nome do Aluno)</label>
          <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="Ex: João da Silva" onKeyDown={(e) => e.key === "Enter" && handle()} />
        </div>
        <div className="input-group">
          <label>Senha</label>
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••" onKeyDown={(e) => e.key === "Enter" && handle()} />
        </div>
        <button className="btn-primary" onClick={handle} style={{marginTop:"8px"}}>ENTRAR</button>
        <div style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: "20px", textAlign: "center", lineHeight: "1.6" }}>
          <strong>Admin:</strong> admin / admin123<br />
          <strong>Aluno:</strong> Nome exato cadastrado / 123
        </div>
      </div>
    </div>
  );
}

// ─── ALUNO VIEW ────────────────────────────────────────────────────────────────
function AlunoView({ aluno, turmas, carregarBanco }) {
  const [salvando, setSalvando] = useState(false);
  const presencas = aluno.presencas || [];
  const checkedIn = presencas.some((p) => p.data === TODAY);
  const freq = calcFreq({ ...aluno, presencas });
  const turmaAluno = turmas.find((t) => t.id === aluno.turma_id);

  const doCheckin = async () => {
    if (checkedIn || !turmaAluno) return;
    setSalvando(true);
    try {
      const now = new Date();
      const hora = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      
      await db.post("presencas", { 
        aluno_id: aluno.id, 
        turma_id: aluno.turma_id,
        data: TODAY,
        hora: hora
      });
      
      await carregarBanco(); 
    } catch (err) {
      alert("Erro ao fazer check-in: " + err.message);
    } finally {
      setSalvando(false);
    }
  };

  // --- Dentro do AlunoView, substitua a parte do 'days' por isto ---
  
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  
  // Quantos dias tem o mês atual?
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Em que dia da semana começa o mês? (0 = Domingo, 1 = Segunda...)
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const days = [];

  // 1. Preencher com espaços vazios antes do dia 1
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push({ key: `empty-${i}`, presente: false, temAula: false, label: "" });
  }

  // 2. Preencher os dias do mês
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    const key = d.toISOString().split("T")[0];
    const diaSemana = d.getDay();
    days.push({ 
      key, 
      presente: presencas.some((p) => p.data === key), 
      temAula: diaSemana !== 0 && diaSemana !== 6, // Considera sábado/domingo como sem aula
      label: String(i) 
    });
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
            <button className={`checkin-btn ${checkedIn ? "done" : ""}`} onClick={doCheckin} disabled={checkedIn || salvando}>
              <span className="checkin-icon">{checkedIn ? "✓" : "👊"}</span>
              <span className="checkin-text">{salvando ? "SALVANDO..." : (checkedIn ? "PRESENTE!" : "CHECK-IN")}</span>
              <span className="checkin-sub">{checkedIn ? "Oss! Boa aula!" : "Toque para marcar"}</span>
            </button>
            <div className="aula-info">
              {turmaAluno ? <>Sua turma: <strong>{turmaAluno.nome}</strong> · {turmaAluno.horario}</> : "Sem turma vinculada 🥋"}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-title">Últimos 30 Dias</div>
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
          {presencas.length === 0 ? <p style={{color: "var(--muted)", fontSize: "0.85rem"}}>Nenhuma presença registrada ainda.</p> : (
            <table>
              <thead><tr><th>Data</th><th>Turma</th><th>Hora</th><th>Status</th></tr></thead>
              <tbody>
                {[...presencas].reverse().slice(0, 8).map((p) => (
                  <tr key={p.id}>
                    <td>{new Date(p.data + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                    <td>{turmas.find(t => t.id === p.turma_id)?.nome}</td>
                    <td>{p.hora.substring(0, 5)}</td>
                    <td><span className="badge badge-presente">Presente</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN VIEW ────────────────────────────────────────────────────────────────
function AdminView({ turmas, alunos, carregarBanco }) {
  const [tab, setTab] = useState("dashboard");
  const [filtroTurma, setFiltroTurma] = useState("Todas");
  const [detalhe, setDetalhe] = useState(null);
  
  const [modalAlunoOpen, setModalAlunoOpen] = useState(false);
  const [formAluno, setFormAluno] = useState({ id: null, nome: "", faixa: "Branca", graus: "0", turma_id: "" });
  const [modalTurmaOpen, setModalTurmaOpen] = useState(false);
  const [formTurma, setFormTurma] = useState({ id: null, nome: "", horario: "", dias: "" });
  const [salvando, setSalvando] = useState(false);

  const presencasHoje = alunos.filter((a) => a.presencas?.some((p) => p.data === TODAY));
  const faltasHoje = alunos.length - presencasHoje.length;
  const freqMedia = alunos.length ? Math.round(alunos.reduce((s, a) => s + calcFreq(a).pct, 0) / alunos.length) : 0;
  const alunosFiltrados = filtroTurma === "Todas" ? alunos : alunos.filter((a) => turmas.find((t) => t.id === a.turma_id)?.nome === filtroTurma);

  const abrirModalAlunoNovo = () => {
    setFormAluno({ id: null, nome: "", faixa: "Branca", graus: "0", turma_id: turmas[0]?.id || "" });
    setModalAlunoOpen(true);
  };

  const abrirModalAlunoEditar = (aluno) => {
    setFormAluno({ id: aluno.id, nome: aluno.nome, faixa: aluno.faixa, graus: String(aluno.graus || 0), turma_id: aluno.turma_id });
    setModalAlunoOpen(true);
  };

  const excluirAluno = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este aluno? Esta ação apagará todas as presenças dele.")) return;
    try {
      await db.delete("alunos", id);
      await carregarBanco();
      setDetalhe(null); 
    } catch (err) { alert("Erro ao excluir: " + err.message); }
  };

  const salvarAluno = async (e) => {
    e.preventDefault();
    if (!formAluno.nome || !formAluno.turma_id) return alert("Preencha o nome e selecione a turma!");
    setSalvando(true);
    try {
      const dataToSave = { nome: formAluno.nome, faixa: formAluno.faixa, graus: parseInt(formAluno.graus), turma_id: formAluno.turma_id };
      if (formAluno.id) {
        await db.patch("alunos", formAluno.id, dataToSave);
        if (detalhe && detalhe.id === formAluno.id) setDetalhe({ ...detalhe, ...dataToSave });
      } else {
        await db.post("alunos", dataToSave);
      }
      await carregarBanco(); 
      setModalAlunoOpen(false);
    } catch (err) { alert("Erro ao salvar aluno: " + err.message); } 
    finally { setSalvando(false); }
  };

  const abrirModalTurmaEditar = (turma) => {
    setFormTurma({ id: turma.id, nome: turma.nome, horario: turma.horario, dias: turma.dias });
    setModalTurmaOpen(true);
  };

  const salvarTurma = async (e) => {
    e.preventDefault();
    if (!formTurma.nome || !formTurma.horario) return alert("Nome e horário são obrigatórios!");
    setSalvando(true);
    try {
      await db.patch("turmas", formTurma.id, {
        nome: formTurma.nome,
        horario: formTurma.horario,
        dias: formTurma.dias
      });
      await carregarBanco(); 
      setModalTurmaOpen(false);
    } catch (err) { alert("Erro ao salvar turma: " + err.message); } 
    finally { setSalvando(false); }
  };

  return (
    <div className="main">
      {modalAlunoOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <button className="btn-close" onClick={() => setModalAlunoOpen(false)}>✕</button>
            <div className="modal-title">{formAluno.id ? "EDITAR ALUNO" : "NOVO ALUNO"}</div>
            <form onSubmit={salvarAluno}>
              <div className="input-group">
                <label>Nome Completo</label>
                <input autoFocus value={formAluno.nome} onChange={(e) => setFormAluno({ ...formAluno, nome: e.target.value })} placeholder="Ex: João da Silva" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="input-group">
                  <label>Faixa</label>
                  <select value={formAluno.faixa} onChange={(e) => setFormAluno({ ...formAluno, faixa: e.target.value })}>
                    {Object.keys(FAIXA_COLORS).map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Graus</label>
                  <select value={formAluno.graus} onChange={(e) => setFormAluno({ ...formAluno, graus: e.target.value })}>
                    {[0, 1, 2, 3, 4].map(g => <option key={g} value={g}>{g} {g === 1 ? "Grau" : "Graus"}</option>)}
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label>Turma</label>
                <select value={formAluno.turma_id} onChange={(e) => setFormAluno({ ...formAluno, turma_id: e.target.value })}>
                  {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: "16px" }} disabled={salvando}>
                {salvando ? "SALVANDO..." : (formAluno.id ? "SALVAR ALTERAÇÕES" : "CADASTRAR")}
              </button>
            </form>
          </div>
        </div>
      )}

      {modalTurmaOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <button className="btn-close" onClick={() => setModalTurmaOpen(false)}>✕</button>
            <div className="modal-title">EDITAR TURMA</div>
            <form onSubmit={salvarTurma}>
              <div className="input-group">
                <label>Nome da Turma</label>
                <input autoFocus value={formTurma.nome} onChange={(e) => setFormTurma({ ...formTurma, nome: e.target.value })} placeholder="Ex: Manhã" />
              </div>
              <div className="input-group">
                <label>Horário</label>
                <input value={formTurma.horario} onChange={(e) => setFormTurma({ ...formTurma, horario: e.target.value })} placeholder="Ex: 07:00 – 08:00" />
              </div>
              <div className="input-group">
                <label>Dias da Semana</label>
                <input value={formTurma.dias} onChange={(e) => setFormTurma({ ...formTurma, dias: e.target.value })} placeholder="Ex: Seg / Qua / Sex" />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: "16px" }} disabled={salvando}>
                {salvando ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
              </button>
            </form>
          </div>
        </div>
      )}

      {detalhe && (
        <>
          <div className="modal-overlay" onClick={() => setDetalhe(null)} style={{background: "rgba(0,0,0,0.5)", zIndex: 199}} />
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
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                    Faixa <span style={{ color: FAIXA_COLORS[detalhe.faixa] }}>{detalhe.faixa}</span> • {detalhe.graus || 0} Graus
                  </div>
                </div>
              </div>
            </div>
            <div style={{ marginBottom: "20px" }}>
               <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "0.9rem", color: "var(--muted)", marginBottom: "10px" }}>ÚLTIMAS PRESENÇAS</div>
               {detalhe.presencas && detalhe.presencas.length > 0 ? (
                 [...detalhe.presencas].reverse().slice(0, 5).map(p => (
                   <div key={p.id} style={{ fontSize: "0.8rem", padding: "8px 0", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
                     <span>{new Date(p.data + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                     <span style={{ color: "var(--green)" }}>{p.hora.substring(0, 5)}</span>
                   </div>
                 ))
               ) : (
                 <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Nenhuma presença registrada.</p>
               )}
            </div>
            <div style={{ marginTop: "auto", display: "flex", gap: "12px", flexDirection: "column" }}>
               <button className="btn-primary" style={{ padding: "10px", fontSize: "1rem" }} onClick={() => abrirModalAlunoEditar(detalhe)}>✏️ EDITAR DADOS</button>
               <button className="btn-danger" style={{ padding: "10px", fontSize: "1rem" }} onClick={() => excluirAluno(detalhe.id)}>🗑️ EXCLUIR ALUNO</button>
            </div>
          </div>
        </>
      )}

      <div className="page-header">
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          {["dashboard", "hoje", "turmas", "alunos", "config"].map((t) => (
            <button key={t} className={`filter-btn ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t === "dashboard" ? "📊 Dashboard" : t === "hoje" ? "📋 Hoje" : t === "turmas" ? "🏋️ Turmas" : t === "alunos" ? "🥋 Alunos" : "⚙️ Configurações"}
            </button>
          ))}
        </div>
        <h1>
          {tab === "dashboard" ? "Dashboard" : tab === "hoje" ? "Presenças de Hoje" : tab === "turmas" ? "Turmas" : tab === "alunos" ? "Alunos" : "Configurações"}
        </h1>
        {tab === "hoje" && <p>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>}
      </div>

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
              {alunos.length === 0 ? <p style={{color: "var(--muted)", fontSize: "0.85rem"}}>Nenhum aluno cadastrado ainda.</p> : alunos.map((a) => {
                const f = calcFreq(a);
                return (
                  <div key={a.id} style={{ marginBottom: "14px", cursor: "pointer" }} onClick={() => setDetalhe(a)}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px", fontSize: "0.83rem" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className="badge-faixa" style={{ background: FAIXA_COLORS[a.faixa] }} />
                        {a.nome}
                      </span>
                      <span style={{ color: f.pct >= 75 ? "var(--green)" : "var(--red)", fontWeight: 600 }}>{f.pct}%</span>
                    </div>
                    <div className="prog-bar"><div className="prog-fill" style={{ width: `${f.pct}%`, background: f.pct >= 75 ? "var(--green)" : f.pct >= 60 ? "var(--gold)" : "var(--red)" }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {tab === "hoje" && (
        <div className="grid-2">
          <div className="card" style={{ padding: "16px 20px" }}>
            <div className="section-title" style={{ color: "var(--green)", marginBottom: "20px" }}>✓ Presentes ({presencasHoje.length})</div>
            {presencasHoje.map((a) => {
              const p = a.presencas.find((x) => x.data === TODAY);
              const turmaNome = turmas.find(t => t.id === p?.turma_id)?.nome || turmas.find(t => t.id === a.turma_id)?.nome;
              return (
                <div key={a.id} className="hoje-item" onClick={() => setDetalhe(a)}>
                  <div className="avatar" style={{ background: "#14532d", color: "#4ade80" }}>{a.foto}</div>
                  <div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 500 }}>{a.nome}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{turmaNome} · {p?.hora?.substring(0, 5)}</div>
                  </div>
                  <span className="badge-faixa" style={{ marginLeft: "auto", background: FAIXA_COLORS[a.faixa] }} />
                </div>
              );
            })}
            {presencasHoje.length === 0 && <p style={{color: "var(--muted)", fontSize: "0.85rem"}}>Ninguém fez check-in ainda.</p>}
          </div>

          <div className="card" style={{ padding: "16px 20px" }}>
            <div className="section-title" style={{ color: "var(--red)", marginBottom: "20px" }}>✗ Ausentes ({faltasHoje})</div>
            {alunos.filter((a) => !a.presencas?.some((p) => p.data === TODAY)).map((a) => {
              const turmaNome = turmas.find(t => t.id === a.turma_id)?.nome;
              return (
                <div key={a.id} className="hoje-item" onClick={() => setDetalhe(a)}>
                  <div className="avatar" style={{ background: "#450a0a", color: "#f87171" }}>{a.foto}</div>
                  <div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 500 }}>{a.nome}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{turmaNome}</div>
                  </div>
                  <span className="badge-faixa" style={{ marginLeft: "auto", background: FAIXA_COLORS[a.faixa] }} />
                </div>
              );
            })}
            {faltasHoje === 0 && alunos.length > 0 && <p style={{color: "var(--muted)", fontSize: "0.85rem"}}>Todos estão presentes! 🎉</p>}
          </div>
        </div>
      )}

      {tab === "turmas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {turmas.map((t) => {
            const qAlunos = alunos.filter((a) => a.turma_id === t.id).length;
            return (
              <div key={t.id} className="card" style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px" }}>
                <div style={{ fontSize: "1.6rem" }}>🥋</div>
                <div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.1rem", letterSpacing: "1px" }}>{t.nome}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "2px" }}>{t.horario} &nbsp;·&nbsp; {t.dias}</div>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
            <div className="filters" style={{ margin: 0 }}>
              {["Todas", ...turmas.map((t) => t.nome)].map((t) => (
                <button key={t} className={`filter-btn ${filtroTurma === t ? "active" : ""}`} onClick={() => setFiltroTurma(t)}>{t}</button>
              ))}
            </div>
            <button className="btn-primary" style={{ width: "auto", padding: "8px 18px", fontSize: "0.95rem", marginTop: 0 }} onClick={abrirModalAlunoNovo}>
              + NOVO ALUNO
            </button>
          </div>
          <div className="table-wrap">
            {alunosFiltrados.length === 0 ? (
              <p style={{color: "var(--muted)", padding: "20px 0"}}>Nenhum aluno encontrado nesta turma.</p>
            ) : (
              <table>
                <thead><tr><th>Aluno</th><th>Faixa e Grau</th><th>Turma</th><th>Ações</th></tr></thead>
                <tbody>
                  {alunosFiltrados.map((a) => (
                    <tr key={a.id}>
                      <td><div style={{ display: "flex", alignItems: "center", gap: "10px" }}><div className="avatar">{a.foto}</div>{a.nome}</div></td>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                          <span className="badge-faixa" style={{ background: FAIXA_COLORS[a.faixa] }} />
                          {a.faixa} ({a.graus || 0} graus)
                        </span>
                      </td>
                      <td style={{ color: "var(--muted)" }}>{turmas.find((t) => t.id === a.turma_id)?.nome}</td>
                      <td><button className="filter-btn" onClick={() => setDetalhe(a)}>Ver Perfil</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === "config" && (
        <div className="card">
          <div className="section-title">Gerenciar Turmas</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {turmas.map(t => (
              <div key={t.id} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", padding: "16px", border: "1px solid var(--border)", borderRadius: "8px", background: "var(--surface2)", gap: "12px" }}>
                <div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.1rem", letterSpacing: "1px" }}>{t.nome}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "4px" }}>{t.horario} &nbsp;•&nbsp; {t.dias}</div>
                </div>
                <button className="filter-btn" style={{ fontWeight: 600 }} onClick={() => abrirModalTurmaEditar(t)}>
                  ✏️ EDITAR
                </button>
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

  const carregarBanco = async () => {
    try {
      setDbStatus("loading");
      const turmasData = await db.get("turmas", "?order=created_at");
      if (!Array.isArray(turmasData)) throw new Error(turmasData?.message || "Erro nas turmas");
      setTurmas(turmasData);

      const alunosData = await db.get("alunos", "?select=*,presencas(*)&order=nome");
      if (!Array.isArray(alunosData)) throw new Error(alunosData?.message || "Erro nos alunos");
      
      const alunosMapeados = alunosData.map(a => ({
        ...a,
        foto: getIniciais(a.nome),
        presencas: a.presencas || []
      }));
      
      setAlunos(alunosMapeados);
      setDbStatus("ok");
    } catch (e) {
      setDbErro(e.message);
      setDbStatus("error");
    }
  };

  useEffect(() => {
    carregarBanco();
  }, []);

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <DbStatusBar status={dbStatus} turmasCount={turmas.length} erro={dbErro} />
        {!session ? (
          <Login onLogin={setSession} alunos={alunos} />
        ) : (
          <>
            <nav className="topnav">
              <div className="nav-logo">OSS<span>.</span>TRACK</div>
              <div className="nav-right">
                <span className="nav-user">{session.username} · {session.role === "admin" ? "Admin" : "Aluno"}</span>
                <button className="btn-logout" onClick={() => setSession(null)}>Sair</button>
              </div>
            </nav>
            {session.role === "admin" 
              ? <AdminView turmas={turmas} alunos={alunos} carregarBanco={carregarBanco} />
              : <AlunoView aluno={alunos.find(a => a.id === session.alunoId)} turmas={turmas} carregarBanco={carregarBanco} />
            }
          </>
        )}
      </div>
    </>
  );
}