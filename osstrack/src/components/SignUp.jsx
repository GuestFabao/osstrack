import { useState } from 'react';
import { supabase } from "../supabaseClient";

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const handleSignUp = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username } // Isso envia o username para o Supabase
      }
    });

    if (error) alert(error.message);
    else alert("Cadastro feito! Cheque seu e-mail.");
  };

  return (
    <div className="login-form">
      <input type="text" placeholder="Username" onChange={(e) => setUsername(e.target.value)} />
      <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="Senha" onChange={(e) => setPassword(e.target.value)} />
      <button onClick={handleSignUp}>Cadastrar</button>
    </div>
  );
}