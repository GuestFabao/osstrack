import { useState, useEffect, useRef } from "react";
import './styles/global.css';
import { db, auth } from './services/api';

// ─── localStorage ─────────────────────────────────────────────────────────────
const store = {
  get(key) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { } },
  remove(key) { try { localStorage.removeItem(key); } catch { } },
};

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const FAIXA_COLORS = {
  Branca: "#e5e5e5", Cinza: "#9ca3af", Amarela: "#eab308", Laranja: "#f97316",
  Verde: "#22c55e", Azul: "#3b82f6", Roxa: "#8b5cf6", Marrom: "#92400e", Preta: "#1a1a1a",
};

const PLANOS = [
  { nome: "Adulto",  valor: 100.00 },
  { nome: "Kids",    valor: 80.00  },
  { nome: "Família", valor: 150.00 },
];

const getToday = () => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,'0') + "-" + String(d.getDate()).padStart(2,'0');
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const calcFreq = (aluno, turmas) => {
  const presentes = aluno.presencas?.length || 0;
  let total = 30;
  if (aluno.created_at && turmas) {
    const turma = turmas.find(t => t.id === aluno.turma_id);
    if (turma && turma.dias) {
      const diasMap = { "Dom":0,"Seg":1,"Ter":2,"Qua":3,"Qui":4,"Sex":5,"Sáb":6 };
      const diasAtivos = turma.dias.split(/[\/,]/).map(d => d.trim().substring(0,3));
      const indicesAtivos = diasAtivos.map(d => diasMap[d]).filter(d => d !== undefined);
      if (indicesAtivos.length > 0) {
        let count = 0;
        let cur = new Date(aluno.created_at); cur.setHours(0,0,0,0);
        const end = new Date(); end.setHours(0,0,0,0);
        while (cur <= end) { if (indicesAtivos.includes(cur.getDay())) count++; cur.setDate(cur.getDate()+1); }
        total = count;
      }
    }
  }
  if (total < presentes) total = presentes;
  if (total === 0) total = 1;
  return { presentes, total, pct: Math.round((presentes/total)*100) };
};

const getIniciais = (nome) => {
  if (!nome) return "—";
  return nome.split(" ").map(n=>n[0]).join("").substring(0,2).toUpperCase();
};

const parseHorario = (s) => {
  if (!s) return null;
  const m = s.match(/(\d{2}):(\d{2}).*?(\d{2}):(\d{2})/);
  if (!m) return null;
  const now = new Date();
  return {
    start: new Date(now.getFullYear(),now.getMonth(),now.getDate(),+m[1],+m[2]),
    end:   new Date(now.getFullYear(),now.getMonth(),now.getDate(),+m[3],+m[4]),
  };
};

const getAniversariantesMes = (alunos) => {
  const mesAtual = new Date().getMonth()+1, diaAtual = new Date().getDate();
  return alunos
    .filter(a => { if (!a.data_nascimento) return false; const [,mes] = a.data_nascimento.split("-"); return parseInt(mes)===mesAtual; })
    .map(a => { const [,,dia] = a.data_nascimento.split("-"); return { ...a, diaAniversario: parseInt(dia), isHoje: parseInt(dia)===diaAtual }; })
    .sort((a,b) => a.diaAniversario - b.diaAniversario);
};

// ─── MOTORES DE WHATSAPP ──────────────────────────────────────────────────────
// Formata telefone para link direto do WhatsApp (remove não-dígitos, adiciona 55 se BR)
const formatarTelefoneWA = (tel) => {
  if (!tel) return "";
  const digits = tel.replace(/\D/g, "");
  if (digits.startsWith("55")) return digits;
  return "55" + digits;
};

const enviarParabensWhatsApp = (aluno, nomeAcademia) => {
  const msg = `🥋 *Ossss, ${aluno.nome.split(" ")[0]}!* 🎂\n\nA equipa *${nomeAcademia}* deseja-lhe um feliz aniversário! 🎉\n\nQue este novo ciclo traga muito treino, evolução e saúde!\n\n*Oss!* 🤜🤛`;
  const tel = formatarTelefoneWA(aluno.telefone);
  const url = tel ? `https://wa.me/${tel}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
};

const enviarCobrancaWhatsApp = (aluno, mensalidade, nomeAcademia) => {
  if (!aluno) return;
  const dataVenc = new Date(mensalidade.data_vencimento + "T12:00:00").toLocaleDateString("pt-BR");
  const msg = `🥋 *Ossss, ${aluno.nome.split(" ")[0]}!*\n\nAqui é da equipa *${nomeAcademia}*.\n\nNotámos que a sua mensalidade referente a *${mensalidade.mes_referencia}* (vencimento a ${dataVenc}) consta como pendente no nosso sistema.\n\nPara não interromper os seus treinos, por favor, realize o pagamento assim que possível. Caso já tenha pago, pedimos que desconsidere esta mensagem!\n\n*Oss!* 🤜🤛`;
  const tel = formatarTelefoneWA(aluno.telefone);
  const url = tel ? `https://wa.me/${tel}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
};

const enviarFaltaWhatsApp = (aluno, faltas, nomeAcademia) => {
  const msg = `🥋 *Ossss, ${aluno.nome.split(" ")[0]}!*\n\nAqui é da equipa *${nomeAcademia}*.\n\nSentimos a sua falta nos tatames! Você já acumula *${faltas} faltas* recentes.\n\nLembre-se que a constância é o segredo da evolução no Jiu-Jitsu. Esperamos por si no próximo treino!\n\n*Oss!* 🤜🤛`;
  const tel = formatarTelefoneWA(aluno.telefone);
  const url = tel ? `https://wa.me/${tel}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
};

// ─── CLOCK HOOK ───────────────────────────────────────────────────────────────
function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  return time;
}

// ─── DB STATUS BAR ─────────────────────────────────────────────────────────────
function DbStatusBar({ status, turmasCount, erro }) {
  if (status === "loading") return <div className="db-bar loading"><div className="db-dot"/>A ligar ao Supabase…</div>;
  if (status === "error")   return <div className="db-bar err"><div className="db-dot"/>Erro: {erro}</div>;
  return <div className="db-bar ok"><div className="db-dot"/>Supabase ligado · {turmasCount} turmas</div>;
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const ADMIN_NAV = [
  { id: "dashboard",  icon: "📊", label: "Dashboard" },
  { id: "hoje",       icon: "📋", label: "Presenças de Hoje" },
  { id: "alunos",     icon: "🥋", label: "Alunos" },
  { id: "turmas",     icon: "🏋️", label: "Turmas" },
  { id: "financeiro", icon: "💰", label: "Financeiro" },
  { id: "config",     icon: "⚙️", label: "Configurações" },
];

function Sidebar({ open, onClose, activeTab, onTabChange, session, academiaAtual, academias, onAcademiaChange, onLogout, notifCount }) {
  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose}/>}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">OSS<span>.</span>TRACK</div>
          {academiaAtual && <div className="sidebar-academy">📍 {academiaAtual.nome}</div>}
        </div>

        <div className="sidebar-profile">
          <div className="sidebar-avatar">{getIniciais(session.username)}</div>
          <div>
            <div className="sidebar-username">{session.username}</div>
            <div className="sidebar-role">{session.role === "admin" ? "Administrador" : "Aluno"}</div>
          </div>
        </div>

        {session.role === "admin" && academias.length > 1 && (
          <div style={{ padding: "0 12px 12px" }}>
            <select
              className="academy-select"
              style={{ width: "100%", maxWidth: "100%" }}
              value={academiaAtual?.id || ""}
              onChange={e => { const nova = academias.find(a => a.id === e.target.value); onAcademiaChange(nova); }}
            >
              {academias.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
        )}

        <nav className="sidebar-nav">
          {session.role === "admin" && ADMIN_NAV.map(item => (
            <button
              key={item.id}
              className={`sidebar-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => { onTabChange(item.id); onClose(); }}
            >
              <span className="sidebar-item-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.id === "hoje" && notifCount > 0 && <span className="sidebar-badge">{notifCount}</span>}
            </button>
          ))}

          {/* O botão WhatsApp pode agora ficar escondido, pois integrámos nos locais certos! */}

          {session.role === "aluno" && (
            <>
              <button className={`sidebar-item ${activeTab === "checkin" ? "active" : ""}`} onClick={() => { onTabChange("checkin"); onClose(); }}>
                <span className="sidebar-item-icon">👊</span><span>Marcar Presença</span>
              </button>
              <button className={`sidebar-item ${activeTab === "historico" ? "active" : ""}`} onClick={() => { onTabChange("historico"); onClose(); }}>
                <span className="sidebar-item-icon">📅</span><span>Meu Histórico</span>
              </button>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-item" style={{ color: "#f87171" }} onClick={onLogout}>
            <span className="sidebar-item-icon">🚪</span><span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function Header({ onHamburger, session, alunos, academiaAtual }) {
  const time = useClock();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const hoje = getToday();
  const anivHoje = alunos.filter(a => {
    if (!a.data_nascimento) return false;
    const [,mes,dia] = a.data_nascimento.split("-");
    const now = new Date();
    return parseInt(mes)===now.getMonth()+1 && parseInt(dia)===now.getDate();
  });
  const semPresenca7dias = alunos.filter(a => {
    if (!a.presencas?.length) return true;
    const ultima = [...a.presencas].sort((x,y) => y.data.localeCompare(x.data))[0];
    const diff = (new Date(hoje) - new Date(ultima.data)) / 86400000;
    return diff >= 7;
  });
  const notifs = [
    ...anivHoje.map(a => ({ icon: "🎂", text: `Aniversário de ${a.nome.split(" ")[0]} hoje!`, cor: "var(--gold)" })),
    ...semPresenca7dias.slice(0,3).map(a => ({ icon: "⚠️", text: `${a.nome.split(" ")[0]} sem treinar há 7+ dias`, cor: "var(--red)" })),
  ];

  useEffect(() => {
    const handle = e => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const hh = String(time.getHours()).padStart(2,"0");
  const mm = String(time.getMinutes()).padStart(2,"0");

  return (
    <header className="topnav">
      <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
        <button className="hamburger" onClick={onHamburger} aria-label="Menu">
          <span/><span/><span/>
        </button>
        <div className="nav-logo">OSS<span>.</span>TRACK</div>
        {academiaAtual && (
          <div className="nav-academy-badge">{academiaAtual.bairro || academiaAtual.nome}</div>
        )}
      </div>

      <div className="nav-right">
        <div className="nav-clock">{hh}:{mm}</div>

        {session.role === "admin" && (
          <div style={{ position:"relative" }} ref={notifRef}>
            <button className="nav-bell" onClick={() => setNotifOpen(v => !v)}>
              🔔
              {notifs.length > 0 && <span className="nav-bell-badge">{notifs.length}</span>}
            </button>
            {notifOpen && (
              <div className="notif-dropdown">
                <div className="notif-header">NOTIFICAÇÕES</div>
                {notifs.length === 0
                  ? <div className="notif-item"><span style={{color:"var(--muted)"}}>Nenhuma notificação.</span></div>
                  : notifs.map((n,i) => (
                    <div key={i} className="notif-item">
                      <div className="notif-dot" style={{ background: n.cor }}/>
                      <span>{n.icon} {n.text}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        <div className="nav-avatar">{getIniciais(session.username)}</div>
      </div>
    </header>
  );
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
function Settings() {
  const [email, setEmail] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [msg, setMsg] = useState("");
  const salvar = async () => {
    if (!novaSenha || novaSenha.length < 6) { setMsg("A nova senha precisa ter pelo menos 6 caracteres."); return; }
    try {
      const data = await auth.signIn(email, senhaAtual);
      if (data.access_token) setMsg("✓ Identidade confirmada.");
    } catch (e) { setMsg("Erro: " + e.message); }
  };
  return (
    <div>
      <div className="input-group"><label>E-mail Admin</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com"/></div>
      <div className="input-group"><label>Senha Atual</label><input type="password" value={senhaAtual} onChange={e=>setSenhaAtual(e.target.value)} placeholder="••••••"/></div>
      <div className="input-group"><label>Nova Senha</label><input type="password" value={novaSenha} onChange={e=>setNovaSenha(e.target.value)} placeholder="••••••"/></div>
      {msg && <div style={{fontSize:"0.82rem",color:msg.startsWith("✓")?"var(--green)":"#f87171",marginBottom:"12px"}}>{msg}</div>}
      <button className="btn-secondary" style={{width:"auto",padding:"10px 20px",fontSize:"0.9rem"}} onClick={salvar}>SALVAR ALTERAÇÕES</button>
    </div>
  );
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────────
function Login({ onLogin, todosAlunos }) {
  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [erro, setErro]   = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setErro(""); setLoading(true);
    try {
      const aluno = todosAlunos.find(a => a.nome.toLowerCase()===email.toLowerCase());
      if (aluno && pass==="4131") { onLogin({ username: aluno.nome, role:"aluno", alunoId: aluno.id }); return; }
      await auth.signIn(email, pass);
      onLogin({ username: email.split("@")[0], role:"admin" });
    } catch(e) { setErro(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">OSS<span>.</span>TRACK</div>
        <div style={{color:"var(--muted)",fontSize:"0.85rem",marginTop:"4px",marginBottom:"32px"}}>
          Sistema de Gestão e Presença
        </div>
        <div className="input-group">
          <label>{isSignUp ? "E-mail de Cadastro" : "E-mail (Admin) ou Nome (Aluno)"}</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder={isSignUp ? "seu@email.com" : "Ex: João da Silva"} onKeyDown={e=>e.key==="Enter"&&handle()}/>
        </div>
        <div className="input-group">
          <label>Senha</label>
          <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••" onKeyDown={e=>e.key==="Enter"&&handle()}/>
        </div>
        {erro && <div className="err">{erro}</div>}
        <button className="btn-primary" onClick={handle} disabled={loading} style={{marginTop:"8px"}}>
          {loading ? "AGUARDE..." : isSignUp ? "CADASTRAR" : "ENTRAR"}
        </button>
      </div>
    </div>
  );
}

// ─── ALUNO VIEW ────────────────────────────────────────────────────────────────
function AlunoView({ aluno, turmas, carregarBanco, activeTab }) {
  const [salvando, setSalvando] = useState(false);
  if (!aluno) return <div className="main"><p style={{color:"var(--muted)"}}>A carregar perfil…</p></div>;

  const presencas = aluno.presencas || [];
  const TODAY = getToday();
  const checkedIn = presencas.some(p => p.data === TODAY);
  const freq = calcFreq({ ...aluno, presencas }, turmas);
  const turmaAluno = turmas.find(t => t.id === aluno.turma_id);

  let btnText="CHECK-IN", btnSub="Toque para marcar", isDisabled=false;
  if (checkedIn) { btnText="PRESENTE!"; btnSub="Oss! Boa aula!"; isDisabled=true; }
  else if (!turmaAluno) { btnText="SEM TURMA"; btnSub="Fale com o professor"; isDisabled=true; }
  else {
    const dias=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
    if (!turmaAluno.dias.includes(dias[new Date().getDay()])) { btnText="DESCANSO"; btnSub="Hoje não é dia de treino"; isDisabled=true; }
    else {
      const times = parseHorario(turmaAluno.horario);
      if (times) {
        const now=new Date(), ws=new Date(times.start);
        ws.setMinutes(ws.getMinutes()-30);
        if (now < ws) { btnText="AGUARDE"; btnSub=`Libertado às ${String(ws.getHours()).padStart(2,"0")}:${String(ws.getMinutes()).padStart(2,"0")}`; isDisabled=true; }
        else if (now > times.end) { btnText="ENCERRADO"; btnSub="A aula já terminou"; isDisabled=true; }
        else { btnText=salvando?"A GUARDAR...":"CHECK-IN"; btnSub="Toque para marcar"; isDisabled=salvando; }
      }
    }
  }

  const doCheckin = async () => {
    if (isDisabled) return;
    setSalvando(true);
    try {
      const now=new Date();
      const hora=`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      await db.post("presencas", { aluno_id:aluno.id, turma_id:aluno.turma_id, data:TODAY, hora });
      await carregarBanco();
    } catch(err) { alert("Erro: "+err.message); }
    finally { setSalvando(false); }
  };

  const date=new Date(), year=date.getFullYear(), month=date.getMonth();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const firstDay=new Date(year,month,1).getDay();
  const days=[];
  for(let i=0;i<firstDay;i++) days.push({key:`e-${i}`,presente:false,temAula:false,label:""});
  for(let i=1;i<=daysInMonth;i++){
    const d=new Date(year,month,i);
    const key=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,'0')+"-"+String(d.getDate()).padStart(2,'0');
    days.push({key,presente:presencas.some(p=>p.data===key),temAula:d.getDay()!==0&&d.getDay()!==6,label:String(i)});
  }

  const isAniversario = aluno.data_nascimento && (() => {
    const [,mes,dia]=aluno.data_nascimento.split("-");
    const now=new Date();
    return parseInt(mes)===now.getMonth()+1 && parseInt(dia)===now.getDate();
  })();

  const showCheckin  = !activeTab || activeTab === "checkin";
  const showHistory  = activeTab === "historico";

  return (
    <div className="main">
      {isAniversario && (
        <div style={{background:"rgba(217,119,6,0.12)",border:"1px solid var(--gold)",borderRadius:"12px",padding:"14px 18px",marginBottom:"16px",display:"flex",alignItems:"center",gap:"12px"}}>
          <span style={{fontSize:"1.8rem"}}>🎂</span>
          <div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.1rem",color:"var(--gold)",letterSpacing:"1px"}}>FELIZ ANIVERSÁRIO, {aluno.nome.split(" ")[0].toUpperCase()}!</div>
            <div style={{fontSize:"0.8rem",color:"var(--muted)"}}>Toda a equipa Team Cruz BJJ lhe deseja um ótimo dia! Oss! 🤜🤛</div>
          </div>
        </div>
      )}

      {/* HERO */}
      <div className="aluno-hero">
        <div className="aluno-avatar">{aluno.foto}</div>
        <div>
          <div className="aluno-nome">{aluno.nome}</div>
          <div className="aluno-meta">
            Faixa <span style={{color:FAIXA_COLORS[aluno.faixa]||"#ccc"}}>{aluno.faixa}</span> ({aluno.graus||0} Graus)
            &nbsp;·&nbsp;{turmaAluno?.nome||"Sem turma"}
          </div>
          {turmaAluno?.professor && (
            <div style={{fontSize:"0.75rem",color:"var(--gold)",marginTop:"3px"}}>👤 {turmaAluno.professor}</div>
          )}
          {aluno.data_nascimento && (
            <div style={{fontSize:"0.75rem",color:"var(--muted)",marginTop:"4px"}}>
              🎂 {new Date(aluno.data_nascimento+"T12:00:00").toLocaleDateString("pt-BR",{day:"numeric",month:"long"})}
            </div>
          )}
          {aluno.created_at && (
            <div style={{fontSize:"0.72rem",color:"var(--muted)",marginTop:"2px"}}>
              📅 Aluno desde {new Date(aluno.created_at).toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"})}
            </div>
          )}
        </div>
        <div style={{marginLeft:"auto",textAlign:"center"}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2.2rem",color:freq.pct>=75?"var(--green)":"var(--red)"}}>{freq.pct}%</div>
          <div style={{fontSize:"0.75rem",color:"var(--muted)"}}>frequência</div>
        </div>
      </div>

      {/* CHECK-IN */}
      {(showCheckin || !showHistory) && (
        <div className="grid-2" style={{marginBottom:"20px"}}>
          <div className="card">
            <div className="section-title">Marcar Presença</div>
            <div className="checkin-zone">
              <button className={`checkin-btn ${checkedIn?"done":""}`} onClick={doCheckin} disabled={isDisabled} style={{opacity:isDisabled&&!checkedIn?0.4:1}}>
                <span className="checkin-icon">{checkedIn?"✓":btnText==="ENCERRADO"||btnText==="DESCANSO"?"🔒":btnText==="AGUARDE"?"⏳":"👊"}</span>
                <span className="checkin-text">{btnText}</span>
                <span className="checkin-sub">{btnSub}</span>
              </button>
              <div className="aula-info">
                {turmaAluno
                  ? <>A sua turma: <strong>{turmaAluno.nome}</strong> · {turmaAluno.horario}{turmaAluno.professor && <><br/><span style={{color:"var(--muted)"}}>👤 {turmaAluno.professor}</span></>}</>
                  : "Sem turma vinculada 🥋"}
              </div>
            </div>
          </div>
          <div className="card">
            <div className="section-title">Mês de {date.toLocaleDateString("pt-BR",{month:"long"})}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"2px",marginBottom:"6px",maxWidth:"300px",margin:"0 auto 6px"}}>
              {["D","S","T","Q","Q","S","S"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:"0.6rem",color:"var(--muted)",padding:"4px 0"}}>{d}</div>)}
            </div>
            <div className="hist-grid">
              {days.map(d=><div key={d.key} className={`hist-day ${d.presente?"presente":d.temAula?"falta":""}`} title={d.key}>{d.label}</div>)}
            </div>
            <div className="hist-legend">
              <span><div className="dot" style={{background:"#14532d"}}/>Presente</span>
              <span><div className="dot" style={{background:"#1e1e1e"}}/>Falta</span>
            </div>
            <div style={{marginTop:"16px",display:"flex",gap:"24px",justifyContent:"center"}}>
              <div style={{textAlign:"center"}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",color:"var(--green)"}}>{freq.presentes}</div><div style={{fontSize:"0.75rem",color:"var(--muted)"}}>presenças</div></div>
              <div style={{textAlign:"center"}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",color:"var(--red)"}}>{freq.total-freq.presentes}</div><div style={{fontSize:"0.75rem",color:"var(--muted)"}}>faltas</div></div>
              <div style={{textAlign:"center"}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",color:"var(--gold)"}}>{freq.total}</div><div style={{fontSize:"0.75rem",color:"var(--muted)"}}>total</div></div>
            </div>
          </div>
        </div>
      )}

      {/* HISTÓRICO */}
      <div className="card">
        <div className="section-title">Histórico Recente</div>
        {presencas.length===0
          ? <p style={{color:"var(--muted)",fontSize:"0.85rem"}}>Nenhuma presença registada ainda.</p>
          : <div className="table-wrap"><table>
              <thead><tr><th>Data</th><th>Turma</th><th>Hora</th><th>Status</th></tr></thead>
              <tbody>
                {[...presencas].reverse().slice(0,10).map(p=>(
                  <tr key={p.id}>
                    <td>{new Date(p.data+"T12:00:00").toLocaleDateString("pt-BR")}</td>
                    <td>{turmas.find(t=>t.id===p.turma_id)?.nome||"—"}</td>
                    <td>{p.hora?.substring(0,5)}</td>
                    <td><span className="badge badge-presente">Presente</span></td>
                  </tr>
                ))}
              </tbody>
            </table></div>}
      </div>
    </div>
  );
}

// ─── ADMIN VIEW ────────────────────────────────────────────────────────────────
function AdminView({ turmas, alunos, mensalidades, carregarBanco, academiaAtual, activeTab }) {
  const [filtroTurma, setFiltroTurma] = useState("Todas");
  const [detalhe, setDetalhe] = useState(null);
  const [modalAlunoOpen, setModalAlunoOpen] = useState(false);
  const [formAluno, setFormAluno] = useState({ id:null, nome:"", faixa:"Branca", graus:"0", turma_id:"", data_nascimento:"", telefone:"", plano:"Adulto", valor_mensalidade:"100.00" });
  const [modalTurmaOpen, setModalTurmaOpen] = useState(false);
  const [formTurma, setFormTurma] = useState({ id:null, nome:"", horario:"", dias:"", professor:"" });
  const [salvando, setSalvando] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const TODAY = getToday();

  // Estados do Financeiro
  const mesAtualStr = new Date().toISOString().slice(0, 7);
  const [filtroMesFin, setFiltroMesFin] = useState(mesAtualStr);

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
    const pHoje = aluno.presencas?.find(p=>p.data===TODAY);
    if (pHoje) {
      if (!window.confirm(`Remover presença de ${aluno.nome}?`)) return;
      try { await db.delete("presencas", pHoje.id); await carregarBanco(); } catch(err) { alert("Erro: "+err.message); }
    } else {
      try {
        const now=new Date();
        const hora=`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
        await db.post("presencas",{ aluno_id:aluno.id, turma_id:aluno.turma_id, data:TODAY, hora });
        await carregarBanco();
      } catch(err) { alert("Erro: "+err.message); }
    }
  };

  const presencasHoje = alunos.filter(a => a.presencas?.some(p=>p.data===TODAY));
  const faltasHoje    = alunos.length - presencasHoje.length;
  const freqMedia     = alunos.length ? Math.round(alunos.reduce((s,a)=>s+calcFreq(a,turmas).pct,0)/alunos.length) : 0;
  const alunosFiltrados = filtroTurma==="Todas" ? alunos : alunos.filter(a=>turmas.find(t=>t.id===a.turma_id)?.nome===filtroTurma);
  const aniversariantes = getAniversariantesMes(alunos);

  const abrirModalAlunoNovo = () => {
    if (!turmas.length) return alert("Registe uma turma primeiro!");
    setFormAluno({ id:null, nome:"", faixa:"Branca", graus:"0", turma_id:turmas[0]?.id||"", data_nascimento:"", telefone:"", plano:"Adulto", valor_mensalidade:"100.00" });
    setModalAlunoOpen(true);
  };
  const abrirModalAlunoEditar = (a) => {
    setFormAluno({ id:a.id, nome:a.nome, faixa:a.faixa, graus:String(a.graus||0), turma_id:a.turma_id, data_nascimento:a.data_nascimento||"", telefone:a.telefone||"", plano:a.plano||"Adulto", valor_mensalidade:String(a.valor_mensalidade||"100.00") });
    setModalAlunoOpen(true);
  };
  const excluirAluno = async (id) => {
    if (!window.confirm("Excluir aluno?")) return;
    try { await db.delete("alunos",id); await carregarBanco(); setDetalhe(null); } catch(err) { alert("Erro: "+err.message); }
  };
  const salvarAluno = async (e) => {
    e.preventDefault();
    if (!formAluno.nome||!formAluno.turma_id) return alert("Preencha o nome e a turma!");
    setSalvando(true);
    try {
      const payload = { 
        nome:formAluno.nome, 
        faixa:formAluno.faixa, 
        graus:parseInt(formAluno.graus), 
        turma_id:formAluno.turma_id, 
        academia_id:academiaAtual?.id, 
        data_nascimento:formAluno.data_nascimento||null,
        telefone:formAluno.telefone||null,
        plano:formAluno.plano||"Adulto",
        valor_mensalidade:parseFloat(formAluno.valor_mensalidade)||100.00,
      };
      if (formAluno.id) { await db.patch("alunos",formAluno.id,payload); if(detalhe?.id===formAluno.id) setDetalhe({...detalhe,...payload}); }
      else await db.post("alunos",payload);
      await carregarBanco(); setModalAlunoOpen(false);
    } catch(err) { alert("Erro: "+err.message); } finally { setSalvando(false); }
  };

  const abrirModalTurmaNova  = () => { setFormTurma({ id:null, nome:"", horario:"", dias:"", professor:"" }); setModalTurmaOpen(true); };
  const abrirModalTurmaEditar = (t) => { setFormTurma({ id:t.id, nome:t.nome, horario:t.horario, dias:t.dias, professor:t.professor||"" }); setModalTurmaOpen(true); };
  const salvarTurma = async (e) => {
    e.preventDefault();
    if (!formTurma.nome||!formTurma.horario) return alert("Nome e horário são obrigatórios!");
    setSalvando(true);
    try {
      if (formTurma.id) await db.patch("turmas",formTurma.id,{ nome:formTurma.nome, horario:formTurma.horario, dias:formTurma.dias, professor:formTurma.professor||null });
      else await db.post("turmas",{ nome:formTurma.nome, horario:formTurma.horario, dias:formTurma.dias, professor:formTurma.professor||null, academia_id:academiaAtual?.id });
      await carregarBanco(); setModalTurmaOpen(false);
    } catch(err) { alert("Erro: "+err.message); } finally { setSalvando(false); }
  };

  // Funções Financeiras
  const mensalidadesFiltradas = mensalidades ? mensalidades.filter(m => m.mes_referencia === filtroMesFin) : [];
  const totalRecebido = mensalidadesFiltradas.filter(m => m.status === 'Pago').reduce((acc, m) => acc + Number(m.valor), 0);
  const totalPendente = mensalidadesFiltradas.filter(m => m.status !== 'Pago').reduce((acc, m) => acc + Number(m.valor), 0);
  const totalEsperado = totalRecebido + totalPendente;

  const gerarMensalidadesDoMes = async () => {
    if (!window.confirm(`Gerar mensalidades de ${filtroMesFin} para todos os alunos matriculados nesta unidade?`)) return;
    setSalvando(true);
    try {
      const alunosComMensalidade = mensalidadesFiltradas.map(m => m.aluno_id);
      const alunosSemMensalidade = alunos.filter(a => !alunosComMensalidade.includes(a.id));

      if (alunosSemMensalidade.length === 0) {
        alert("Todos os alunos já possuem mensalidade gerada para este mês!");
        setSalvando(false);
        return;
      }

      for (const aluno of alunosSemMensalidade) {
        await db.post("mensalidades", {
          aluno_id: aluno.id,
          academia_id: academiaAtual.id,
          valor: aluno.valor_mensalidade || 100.00,
          data_vencimento: `${filtroMesFin}-10`,
          mes_referencia: filtroMesFin,
          status: 'Pendente'
        });
      }
      await carregarBanco();
      alert(`${alunosSemMensalidade.length} mensalidades geradas com sucesso!`);
    } catch(err) {
      alert("Erro ao gerar mensalidades: " + err.message);
    } finally {
      setSalvando(false);
    }
  };

  const registrarPagamento = async (id) => {
    try {
      const dataPagamento = getToday();
      await db.patch("mensalidades", id, { status: 'Pago', data_pagamento: dataPagamento, forma_pagamento: 'PIX' });
      await carregarBanco();
    } catch(err) {
      alert("Erro ao registar pagamento: " + err.message);
    }
  };

  return (
    <div className="main">

      {/* MODAL SAIR */}
      {showExitModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ textAlign: "center" }}>
            <div className="modal-title">SAIR DO APP?</div>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: "24px" }}>Deseja realmente fechar o OSS.TRACK?</p>
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
            <button className="btn-close" onClick={()=>setModalAlunoOpen(false)}>✕</button>
            <div className="modal-title">{formAluno.id?"EDITAR ALUNO":"NOVO ALUNO"}</div>
            <form onSubmit={salvarAluno}>
              <div className="input-group"><label>Nome Completo</label><input autoFocus value={formAluno.nome} onChange={e=>setFormAluno({...formAluno,nome:e.target.value})} placeholder="Ex: João da Silva"/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div className="input-group"><label>Faixa</label><select value={formAluno.faixa} onChange={e=>setFormAluno({...formAluno,faixa:e.target.value})}>{Object.keys(FAIXA_COLORS).map(f=><option key={f}>{f}</option>)}</select></div>
                <div className="input-group"><label>Graus</label><select value={formAluno.graus} onChange={e=>setFormAluno({...formAluno,graus:e.target.value})}>{[0,1,2,3,4].map(g=><option key={g} value={g}>{g} {g===1?"Grau":"Graus"}</option>)}</select></div>
              </div>
              <div className="input-group"><label>Turma</label><select value={formAluno.turma_id} onChange={e=>setFormAluno({...formAluno,turma_id:e.target.value})}>{turmas.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}</select></div>
              <div className="input-group"><label>Data de Nascimento 🎂</label><input type="date" value={formAluno.data_nascimento} onChange={e=>setFormAluno({...formAluno,data_nascimento:e.target.value})} style={{colorScheme:"dark"}}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div className="input-group">
                  <label>Plano 💰</label>
                  <select value={formAluno.plano} onChange={e=>{
                    const p = PLANOS.find(x=>x.nome===e.target.value);
                    setFormAluno({...formAluno, plano:e.target.value, valor_mensalidade:String(p?.valor||100)});
                  }}>
                    {PLANOS.map(p=><option key={p.nome} value={p.nome}>{p.nome} — R$ {p.valor.toFixed(2).replace(".",",")}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Valor (R$)</label>
                  <input type="number" step="0.01" min="0" value={formAluno.valor_mensalidade} onChange={e=>setFormAluno({...formAluno,valor_mensalidade:e.target.value})} placeholder="100.00"/>
                </div>
              </div>
              <div className="input-group"><label>WhatsApp 📱</label><input type="tel" value={formAluno.telefone} onChange={e=>setFormAluno({...formAluno,telefone:e.target.value})} placeholder="(38) 99999-9999"/></div>
              <button type="submit" className="btn-primary" style={{marginTop:"16px"}} disabled={salvando}>{salvando?"A GUARDAR...":formAluno.id?"SALVAR":"REGISTAR"}</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TURMA */}
      {modalTurmaOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <button className="btn-close" onClick={()=>setModalTurmaOpen(false)}>✕</button>
            <div className="modal-title">{formTurma.id?"EDITAR TURMA":"NOVA TURMA"}</div>
            <form onSubmit={salvarTurma}>
              <div className="input-group"><label>Nome</label><input autoFocus value={formTurma.nome} onChange={e=>setFormTurma({...formTurma,nome:e.target.value})} placeholder="Ex: Manhã"/></div>
              <div className="input-group"><label>Horário</label><input value={formTurma.horario} onChange={e=>setFormTurma({...formTurma,horario:e.target.value})} placeholder="Ex: 07:00 – 08:30"/></div>
              <div className="input-group"><label>Dias da Semana</label><input value={formTurma.dias} onChange={e=>setFormTurma({...formTurma,dias:e.target.value})} placeholder="Ex: Seg / Qua / Sex"/></div>
              <div className="input-group"><label>Professor 👤</label><input value={formTurma.professor} onChange={e=>setFormTurma({...formTurma,professor:e.target.value})} placeholder="Ex: Prof. Diego Rocha"/></div>
              <button type="submit" className="btn-primary" style={{marginTop:"16px"}} disabled={salvando}>{salvando?"A GUARDAR...":"SALVAR"}</button>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL PANEL */}
      {detalhe && (
        <>
          <div className="modal-overlay" onClick={()=>setDetalhe(null)} style={{background:"rgba(0,0,0,0.5)",zIndex:199}}/>
          <div className="detail-panel">
            <div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"20px"}}>
                <strong style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.1rem"}}>FICHA DO ALUNO</strong>
                <button style={{background:"none",border:"none",color:"var(--text)",cursor:"pointer"}} onClick={()=>setDetalhe(null)}>✕</button>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"14px",marginBottom:"20px"}}>
                <div className="avatar" style={{background:"var(--red)",width:50,height:50,fontSize:"1rem"}}>{detalhe.foto}</div>
                <div>
                  <div style={{fontWeight:600}}>{detalhe.nome}</div>
                  <div style={{fontSize:"0.8rem",color:"var(--muted)"}}>Faixa <span style={{color:FAIXA_COLORS[detalhe.faixa]}}>{detalhe.faixa}</span> · {detalhe.graus||0} Graus</div>
                  {detalhe.data_nascimento && <div style={{fontSize:"0.75rem",color:"var(--muted)",marginTop:"2px"}}>🎂 {new Date(detalhe.data_nascimento+"T12:00:00").toLocaleDateString("pt-BR",{day:"numeric",month:"long"})}</div>}
                  {detalhe.created_at && <div style={{fontSize:"0.72rem",color:"var(--muted)",marginTop:"2px"}}>📅 Aluno desde {new Date(detalhe.created_at).toLocaleDateString("pt-BR",{day:"numeric",month:"short",year:"numeric"})}</div>}
                  {detalhe.plano && (
                    <div style={{fontSize:"0.75rem",marginTop:"6px",display:"flex",gap:"8px",flexWrap:"wrap"}}>
                      <span style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:"6px",padding:"2px 8px",color:"var(--gold)"}}>
                        💰 {detalhe.plano}
                      </span>
                      <span style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:"6px",padding:"2px 8px",color:"var(--green)"}}>
                        R$ {Number(detalhe.valor_mensalidade||100).toFixed(2).replace(".",",")}
                      </span>
                      {detalhe.telefone && (
                        <a href={`https://wa.me/${formatarTelefoneWA(detalhe.telefone)}`} target="_blank" rel="noreferrer"
                          style={{background:"#14532d",border:"1px solid #16a34a",borderRadius:"6px",padding:"2px 8px",color:"#4ade80",textDecoration:"none",fontSize:"0.75rem"}}>
                          📱 {detalhe.telefone}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div style={{marginBottom:"20px"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"0.9rem",color:"var(--muted)",marginBottom:"10px"}}>ÚLTIMAS PRESENÇAS</div>
              <div className="scroll-list" style={{maxHeight:"220px"}}>
                {detalhe.presencas?.length>0 ? [...detalhe.presencas].reverse().map(p=>(
                  <div key={p.id} style={{fontSize:"0.8rem",padding:"8px 0",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between"}}>
                    <span>{new Date(p.data+"T12:00:00").toLocaleDateString("pt-BR")}</span>
                    <span style={{color:"var(--green)"}}>{p.hora?.substring(0,5)}</span>
                  </div>
                )) : <p style={{fontSize:"0.8rem",color:"var(--muted)"}}>Nenhuma presença ainda.</p>}
              </div>
            </div>
            <div style={{marginTop:"auto",display:"flex",gap:"12px",flexDirection:"column"}}>
              <button className="btn-primary" style={{padding:"10px",fontSize:"1rem"}} onClick={()=>abrirModalAlunoEditar(detalhe)}>✏️ EDITAR DADOS</button>
              <button className="btn-danger"  style={{padding:"10px",fontSize:"1rem"}} onClick={()=>excluirAluno(detalhe.id)}>🗑️ EXCLUIR ALUNO</button>
            </div>
          </div>
        </>
      )}

      {/* PAGE TITLE */}
      <div className="page-header">
        <h1>
          {activeTab==="dashboard"?"Dashboard"
          :activeTab==="hoje"?"Presenças de Hoje"
          :activeTab==="alunos"?"Alunos"
          :activeTab==="turmas"?"Turmas"
          :activeTab==="financeiro"?"Financeiro"
          :"Configurações"}
        </h1>
        {activeTab==="hoje" && <p>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>}
      </div>

      {/* DASHBOARD */}
      {activeTab==="dashboard" && (
        <>
          <div className="grid-4">
            <div className="card stat-card"><div className="stat-label">Total de Alunos</div><div className="stat-value">{alunos.length}</div><div className="stat-sub">Matriculados</div></div>
            <div className="card stat-card"><div className="stat-label">Presentes Hoje</div><div className="stat-value green">{presencasHoje.length}</div><div className="stat-sub">Check-ins</div></div>
            <div className="card stat-card"><div className="stat-label">Faltas Hoje</div><div className="stat-value red">{faltasHoje}</div><div className="stat-sub">Ausentes</div></div>
            <div className="card stat-card"><div className="stat-label">Freq. Média</div><div className="stat-value gold">{freqMedia}%</div><div className="stat-sub">Geral</div></div>
          </div>
          <div className="grid-2">
            <div className="card">
              <div className="section-title">Frequência da Academia</div>
              <div className="scroll-list">
                {alunos.length===0 ? <p style={{color:"var(--muted)",fontSize:"0.85rem"}}>Nenhum aluno registado.</p>
                  : alunos.map(a=>{ const f=calcFreq(a,turmas); return (
                    <div key={a.id} style={{marginBottom:"14px",cursor:"pointer"}} onClick={()=>setDetalhe(a)}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px",fontSize:"0.83rem"}}>
                        <span style={{display:"flex",alignItems:"center",gap:"8px"}}><span className="badge-faixa" style={{background:FAIXA_COLORS[a.faixa]}}/>{a.nome}</span>
                        <span style={{color:f.pct>=75?"var(--green)":"var(--red)",fontWeight:600}}>{f.pct}%</span>
                      </div>
                      <div className="prog-bar"><div className="prog-fill" style={{width:`${f.pct}%`,background:f.pct>=75?"var(--green)":f.pct>=60?"var(--gold)":"var(--red)"}}/></div>
                    </div>
                  );})}
              </div>
            </div>
            
            <div className="card">
              <div className="section-title">Em Risco ⚠️</div>
              <div className="scroll-list">
                {alunos.filter(a=>calcFreq(a,turmas).pct<70).length===0
                  ? <p style={{color:"var(--muted)",fontSize:"0.85rem"}}>Nenhum aluno em risco 🎉</p>
                  : alunos.filter(a=>calcFreq(a,turmas).pct<70).map(a=>{ const f=calcFreq(a,turmas); return (
                    <div key={a.id} className="hoje-item" onClick={()=>setDetalhe(a)}>
                      <div className="avatar" style={{background:"var(--red-dim)"}}>{a.foto}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{fontSize:"0.88rem",fontWeight:500}}>{a.nome}</div>
                          <div style={{fontSize:"0.75rem",color:"var(--muted)"}}>{f.total-f.presentes} faltas · {turmas.find(t=>t.id===a.turma_id)?.nome}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <span style={{color:"var(--red)",fontWeight:700}}>{f.pct}%</span>
                          {/* BOTÃO WHATSAPP - ALUNOS EM RISCO */}
                          <button onClick={(e)=>{e.stopPropagation(); enviarFaltaWhatsApp(a, f.total - f.presentes, academiaAtual?.nome || "Team Cruz BJJ");}} style={{background:"#16a34a",border:"none",color:"white",borderRadius:"6px",padding:"4px 8px",cursor:"pointer",fontSize:"0.7rem",fontWeight:600}}>
                              💬 Chamar
                          </button>
                      </div>
                    </div>
                  );})}
              </div>
            </div>
          </div>

          {/* ANIVERSARIANTES */}
          {aniversariantes.length>0 && (()=>{
            const mesNome=new Date().toLocaleDateString("pt-BR",{month:"long"});
            return (
              <div className="card" style={{marginTop:"20px",borderColor:"var(--gold)",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",right:-10,top:"50%",transform:"translateY(-50%)",fontSize:"8rem",opacity:0.04,pointerEvents:"none"}}>🎂</div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
                  <div className="section-title" style={{color:"var(--gold)",margin:0}}>🎂 Aniversariantes de {mesNome.charAt(0).toUpperCase()+mesNome.slice(1)}</div>
                  <span style={{background:"#451a00",color:"var(--gold)",padding:"3px 12px",borderRadius:"20px",fontSize:"0.75rem",fontWeight:600}}>{aniversariantes.length} aluno{aniversariantes.length>1?"s":""}</span>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                  {aniversariantes.map(a=>(
                    <div key={a.id} style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px",borderRadius:"8px",flexWrap:"wrap",background:a.isHoje?"rgba(217,119,6,0.12)":"var(--surface2)",border:`1px solid ${a.isHoje?"var(--gold)":"var(--border)"}`}}>
                      <div style={{width:42,height:42,borderRadius:"50%",flexShrink:0,background:a.isHoje?"var(--gold)":"var(--surface)",border:`2px solid ${a.isHoje?"var(--gold)":"var(--border)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:a.isHoje?"1.2rem":"0.75rem",fontWeight:600,color:a.isHoje?"#0a0a0a":"var(--text)"}}>
                        {a.isHoje?"🎂":a.foto}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:"0.9rem",display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
                          {a.nome}
                          {a.isHoje && <span style={{background:"var(--gold)",color:"#0a0a0a",fontSize:"0.65rem",padding:"2px 8px",borderRadius:"10px",fontWeight:700}}>HOJE! 🎉</span>}
                        </div>
                        <div style={{fontSize:"0.75rem",color:"var(--muted)",marginTop:"2px"}}>Dia {a.diaAniversario} · {turmas.find(t=>t.id===a.turma_id)?.nome} · Faixa <span style={{color:FAIXA_COLORS[a.faixa]}}>{a.faixa}</span></div>
                      </div>
                      <button onClick={()=>enviarParabensWhatsApp(a,academiaAtual?.nome||"Team Cruz BJJ")} style={{background:"#16a34a",border:"none",color:"white",borderRadius:"8px",padding:"8px 14px",cursor:"pointer",fontSize:"0.78rem",fontWeight:600,display:"flex",alignItems:"center",gap:"6px",whiteSpace:"nowrap",flexShrink:0}}>
                        💬 Parabéns
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* HOJE */}
      {activeTab==="hoje" && (
        <div className="grid-2">
          <div className="card">
            <div className="section-title" style={{color:"var(--green)"}}>✓ Presentes ({presencasHoje.length})</div>
            <div className="scroll-list">
              {presencasHoje.length===0 && <p style={{color:"var(--muted)",fontSize:"0.85rem"}}>Ninguém fez check-in ainda.</p>}
              {presencasHoje.map(a=>{ const p=a.presencas.find(x=>x.data===TODAY); return (
                <div key={a.id} className="hoje-item" onClick={()=>setDetalhe(a)}>
                  <div className="avatar" style={{background:"#14532d",color:"#4ade80"}}>{a.foto}</div>
                  <div style={{flex:1}}><div style={{fontSize:"0.88rem",fontWeight:500}}>{a.nome}</div><div style={{fontSize:"0.75rem",color:"var(--muted)"}}>{turmas.find(t=>t.id===p?.turma_id)?.nome} · {p?.hora?.substring(0,5)}</div></div>
                  <button onClick={e=>{e.stopPropagation();togglePresencaManual(a);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:"1rem"}}>❌</button>
                </div>
              );})}
            </div>
          </div>
          <div className="card">
            <div className="section-title" style={{color:"var(--red)"}}>✗ Ausentes ({faltasHoje})</div>
            <div className="scroll-list">
              {faltasHoje===0&&alunos.length>0 && <p style={{color:"var(--muted)",fontSize:"0.85rem"}}>Todos presentes! 🎉</p>}
              {alunos.filter(a=>!a.presencas?.some(p=>p.data===TODAY)).map(a=>(
                <div key={a.id} className="hoje-item" onClick={()=>setDetalhe(a)}>
                  <div className="avatar" style={{background:"#450a0a",color:"#f87171"}}>{a.foto}</div>
                  <div style={{flex:1}}><div style={{fontSize:"0.88rem",fontWeight:500}}>{a.nome}</div><div style={{fontSize:"0.75rem",color:"var(--muted)"}}>{turmas.find(t=>t.id===a.turma_id)?.nome}</div></div>
                  <button onClick={e=>{e.stopPropagation();togglePresencaManual(a);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:"1rem"}}>✅</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TURMAS */}
      {activeTab==="turmas" && (
        <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
          {turmas.length===0 && <p style={{color:"var(--muted)"}}>Nenhuma turma nesta unidade.</p>}
          {turmas.map(t=>{ const q=alunos.filter(a=>a.turma_id===t.id).length; return (
            <div key={t.id} className="card" style={{display:"flex",alignItems:"center",gap:"14px"}}>
              <div style={{fontSize:"1.6rem"}}>🥋</div>
              <div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.1rem",letterSpacing:"1px"}}>{t.nome}</div><div style={{fontSize:"0.78rem",color:"var(--muted)",marginTop:"2px"}}>{t.horario} · {t.dias}</div>{t.professor&&<div style={{fontSize:"0.75rem",color:"var(--gold)",marginTop:"2px"}}>👤 {t.professor}</div>}</div>
              <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"16px"}}>
                <div style={{textAlign:"right"}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.4rem",color:"var(--gold)"}}>{q}</div><div style={{fontSize:"0.7rem",color:"var(--muted)"}}>alunos</div></div>
                <button className="filter-btn" onClick={()=>abrirModalTurmaEditar(t)}>✏️ Editar</button>
              </div>
            </div>
          );})}
        </div>
      )}

      {/* ALUNOS */}
      {activeTab==="alunos" && (
        <div className="card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px",flexWrap:"wrap",gap:"10px"}}>
            <div className="filters">
              {["Todas",...turmas.map(t=>t.nome)].map(t=>(
                <button key={t} className={`filter-btn ${filtroTurma===t?"active":""}`} onClick={()=>setFiltroTurma(t)}>{t}</button>
              ))}
            </div>
            <button className="btn-primary" style={{width:"auto",padding:"8px 18px",fontSize:"0.9rem"}} onClick={abrirModalAlunoNovo}>+ NOVO ALUNO</button>
          </div>
          {alunosFiltrados.length===0 ? <p style={{color:"var(--muted)"}}>Nenhum aluno.</p> : (
            <div className="table-wrap scroll-list" style={{ maxHeight: "400px" }}>
              <table>
              <thead><tr><th>Aluno</th><th>Faixa</th><th>Turma</th><th>Plano</th><th>Aniversário</th><th></th></tr></thead>
              <tbody>
                {alunosFiltrados.map(a=>(
                  <tr key={a.id}>
                    <td><div style={{display:"flex",alignItems:"center",gap:"10px"}}><div className="avatar">{a.foto}</div>{a.nome}</div></td>
                    <td><span style={{display:"flex",alignItems:"center",gap:"7px"}}><span className="badge-faixa" style={{background:FAIXA_COLORS[a.faixa]}}/>{a.faixa} ({a.graus||0}g)</span></td>
                    <td style={{color:"var(--muted)"}}>{turmas.find(t=>t.id===a.turma_id)?.nome}</td>
                    <td>
                      <span style={{fontSize:"0.78rem"}}>
                        <span style={{color:"var(--gold)"}}>{a.plano||"Adulto"}</span>
                        <span style={{color:"var(--muted)",marginLeft:"4px"}}>R$ {Number(a.valor_mensalidade||100).toFixed(2).replace(".",",")}</span>
                      </span>
                    </td>
                    <td style={{color:"var(--muted)",fontSize:"0.82rem"}}>{a.data_nascimento?new Date(a.data_nascimento+"T12:00:00").toLocaleDateString("pt-BR",{day:"numeric",month:"short"}):"—"}</td>
                    <td><button className="filter-btn" onClick={()=>setDetalhe(a)}>Ver Perfil</button></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      )}

      {/* FINANCEIRO */}
      {activeTab==="financeiro" && (
        <>
          <div className="card" style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "0.88rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Filtrar Mês:</span>
                <input type="month" value={filtroMesFin} onChange={e => setFiltroMesFin(e.target.value)} className="academy-select" />
              </div>
              <button className="btn-primary" style={{ width: "auto", padding: "8px 18px", fontSize: "0.9rem" }} onClick={gerarMensalidadesDoMes} disabled={salvando}>
                {salvando ? "A GERAR..." : "+ GERAR COBRANÇAS DO MÊS"}
              </button>
            </div>
          </div>

          <div className="grid-4">
            <div className="card stat-card"><div className="stat-label">Total Esperado</div><div className="stat-value">{totalEsperado.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div><div className="stat-sub">Mês {filtroMesFin}</div></div>
            <div className="card stat-card"><div className="stat-label">Total Recebido</div><div className="stat-value green">{totalRecebido.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div><div className="stat-sub">Pago</div></div>
            <div className="card stat-card"><div className="stat-label">Total Pendente</div><div className="stat-value red">{totalPendente.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div><div className="stat-sub">A Receber</div></div>
            <div className="card stat-card"><div className="stat-label">Inadimplência</div><div className="stat-value gold">{totalEsperado ? Math.round((totalPendente/totalEsperado)*100) : 0}%</div><div className="stat-sub">Taxa do Mês</div></div>
          </div>

          <div className="card">
            <div className="section-title">Mensalidades de {filtroMesFin}</div>
            <div className="table-wrap scroll-list" style={{ paddingRight: 0 }}>
              <table>
                <thead><tr><th>Aluno</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {mensalidadesFiltradas.map((m) => {
                    const aluno = alunos.find(a => a.id === m.aluno_id);
                    return (
                      <tr key={m.id}>
                        <td><div style={{ display: "flex", alignItems: "center", gap: "10px" }}><div className="avatar">{aluno?.foto || "—"}</div>{aluno?.nome || "Aluno removido"}</div></td>
                        <td>{new Date(m.data_vencimento + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                        <td>{Number(m.valor).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
                        <td><span className={`badge ${m.status === 'Pago' ? 'badge-presente' : 'badge-pendente'}`}>{m.status}</span></td>
                        <td>
                          {m.status !== 'Pago' ? (
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button className="filter-btn active" onClick={() => registrarPagamento(m.id)}>Marcar Pago</button>
                              {/* BOTÃO WHATSAPP - MENSALIDADE ATRASADA */}
                              <button className="filter-btn" style={{ background: "#16a34a", color: "white", borderColor: "#16a34a" }} onClick={() => enviarCobrancaWhatsApp(aluno, m, academiaAtual?.nome || "Team Cruz BJJ")}>💬 Cobrar</button>
                            </div>
                          ) : (
                            <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Pago dia {new Date(m.data_pagamento + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {mensalidadesFiltradas.length === 0 && <tr><td colSpan="5" style={{ textAlign: "center", color: "var(--muted)", padding: "24px" }}>Nenhuma mensalidade gerada para este mês.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* CONFIG */}
      {activeTab==="config" && (
        <>
          <div className="card" style={{marginBottom:"20px"}}><div className="section-title">A Minha Conta</div><Settings/></div>
          <div className="card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
              <div className="section-title" style={{margin:0}}>Gerir Turmas</div>
              <button className="btn-primary" style={{width:"auto",padding:"6px 14px",fontSize:"0.85rem"}} onClick={abrirModalTurmaNova}>+ NOVA TURMA</button>
            </div>
            <div className="scroll-list" style={{display:"flex",flexDirection:"column",gap:"14px"}}>
              {turmas.length===0 && <p style={{color:"var(--muted)"}}>Nenhuma turma.</p>}
              {turmas.map(t=>(
                <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px",border:"1px solid var(--border)",borderRadius:"8px",background:"var(--surface2)",gap:"12px",flexWrap:"wrap"}}>
                  <div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.1rem",letterSpacing:"1px"}}>{t.nome}</div><div style={{fontSize:"0.8rem",color:"var(--muted)",marginTop:"4px"}}>{t.horario} · {t.dias}</div></div>
                  <button className="filter-btn" onClick={()=>abrirModalTurmaEditar(t)}>✏️ EDITAR</button>
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
  const [session, setSession]           = useState(()=>store.get("osstrack_session"));
  const [academias, setAcademias]       = useState([]);
  const [academiaAtual, setAcademiaAtual] = useState(()=>store.get("osstrack_admin_academia")||null);
  const [todosAlunos, setTodosAlunos]   = useState([]);
  const [turmas, setTurmas]             = useState([]);
  const [alunos, setAlunos]             = useState([]);
  const [mensalidades, setMensalidades] = useState([]); // Estado Financeiro
  const [dbStatus, setDbStatus]         = useState("loading");
  const [dbErro, setDbErro]             = useState("");
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [activeTab, setActiveTab]       = useState("dashboard");

  useEffect(()=>{ if(session) store.set("osstrack_session",session); else store.remove("osstrack_session"); },[session]);
  useEffect(()=>{ if(academiaAtual&&session?.role==="admin") store.set("osstrack_admin_academia",academiaAtual); },[academiaAtual,session]);

  const carregarBanco = async (idForcado=null) => {
    try {
      setDbStatus("loading");
      const academiasData = await db.get("academias","?order=nome");
      if (Array.isArray(academiasData)) setAcademias(academiasData);

      const todosData = await db.get("alunos","?select=*,presencas(*)&order=nome");
      let listaGlobal=[];
      if (Array.isArray(todosData)) {
        listaGlobal = todosData.map(a=>({...a, foto:getIniciais(a.nome), presencas:a.presencas||[]}));
        setTodosAlunos(listaGlobal);
      }

      let idAtivo = idForcado;
      if (!idAtivo) {
        if (session?.role==="aluno") {
          const me = listaGlobal.find(a=>a.id===session.alunoId);
          if (me) idAtivo=me.academia_id;
        } else {
          const mem = store.get("osstrack_admin_academia");
          idAtivo = mem?.id || (Array.isArray(academiasData)&&academiasData.length>0 ? academiasData[0].id : null);
        }
      }

      if (idAtivo && Array.isArray(academiasData)) {
        const nova = academiasData.find(a=>a.id===idAtivo);
        if (nova) setAcademiaAtual(nova);
      }

      if (!idAtivo) { 
        setTurmas([]); 
        setAlunos([]); 
        setMensalidades([]);
        setDbStatus("ok"); 
        return; 
      }

      const turmasData = await db.get("turmas",`?academia_id=eq.${idAtivo}&order=created_at`);
      if (!Array.isArray(turmasData)) throw new Error(turmasData?.message||"Erro nas turmas");
      setTurmas(turmasData);
      
      setAlunos(listaGlobal.filter(a=>a.academia_id===idAtivo));

      // Puxando as mensalidades do banco
      const mensalidadesData = await db.get("mensalidades", `?academia_id=eq.${idAtivo}&order=data_vencimento`);
      setMensalidades(Array.isArray(mensalidadesData) ? mensalidadesData : []);

      setDbStatus("ok");
    } catch(e) { setDbErro(e.message); setDbStatus("error"); }
  };

  useEffect(()=>{ carregarBanco(); },[session?.role, session?.alunoId]);

  const alunoLogado = session?.role==="aluno" ? todosAlunos.find(a=>a.id===session.alunoId) : null;

  // contagem de notificações (alunos ausentes hoje)
  const today = getToday();
  const ausentes = alunos.filter(a=>!a.presencas?.some(p=>p.data===today)).length;

  return (
    <div className="app">
      <DbStatusBar status={dbStatus} turmasCount={turmas.length} erro={dbErro}/>
      {!session ? (
        <Login onLogin={setSession} todosAlunos={todosAlunos}/>
      ) : (
        <>
          <Header
            onHamburger={()=>setSidebarOpen(v=>!v)}
            session={session}
            alunos={alunos}
            academiaAtual={academiaAtual}
          />
          <div className="layout">
            <Sidebar
              open={sidebarOpen}
              onClose={()=>setSidebarOpen(false)}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              session={session}
              academiaAtual={academiaAtual}
              academias={academias}
              onAcademiaChange={(nova)=>{ setAcademiaAtual(nova); carregarBanco(nova.id); setSidebarOpen(false); }}
              onLogout={()=>setSession(null)}
              notifCount={ausentes}
            />
            <div className="content-area">
              {session.role==="admin"
                ? <AdminView turmas={turmas} alunos={alunos} mensalidades={mensalidades} carregarBanco={carregarBanco} academiaAtual={academiaAtual} activeTab={activeTab}/>
                : <AlunoView aluno={alunoLogado} turmas={turmas} carregarBanco={carregarBanco} activeTab={activeTab}/>
              }
            </div>
          </div>
        </>
      )}
    </div>
  );
}