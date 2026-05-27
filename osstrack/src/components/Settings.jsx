import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Settings() {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', user.id)
          .single();

        if (data) {
          setFullName(data.full_name || '');
          setUsername(data.username || '');
        }
      }
      setLoading(false);
    }
    getProfile();
  }, []);

  const handleUpdate = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, username: username })
      .eq('id', user.id);

    if (error) alert("Erro ao atualizar: " + error.message);
    else alert("Perfil atualizado com sucesso!");
  };

  if (loading) return <p style={{color: "var(--muted)", textAlign: "center"}}>Carregando perfil...</p>;

  return (
    <div style={{ maxWidth: "500px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div className="input-group" style={{ marginBottom: 0 }}>
        <label>Nome Completo (Admin)</label>
        <input 
          type="text" 
          placeholder="Ex: Mestre Fabio" 
          value={fullName} 
          onChange={(e) => setFullName(e.target.value)} 
        />
      </div>
      <div className="input-group" style={{ marginBottom: 0 }}>
        <label>Nome de Usuário</label>
        <input 
          type="text" 
          placeholder="Ex: fabao_bjj" 
          value={username} 
          onChange={(e) => setUsername(e.target.value)} 
        />
      </div>
      <button className="btn-primary" onClick={handleUpdate} style={{ marginTop: "8px" }}>
        SALVAR ALTERAÇÕES
      </button>
    </div>
  );
}