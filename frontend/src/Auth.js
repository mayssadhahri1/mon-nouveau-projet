import React, { useState } from 'react';

export default function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    // L'API Gateway tourne généralement sur le port 4000 ou 5000 en local
    const url = isLogin ? 'http://localhost:4000/auth/login' : 'http://localhost:4000/auth/register';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Une erreur est survenue');
      }

      setMessage(data.message);
      if (isLogin && data.user) {
        localStorage.setItem('token', data.token); // Sauvegarde du token de session
        if (onLoginSuccess) onLoginSuccess(data.user);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>{isLogin ? 'Connexion' : 'Inscription'}</h2>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label>Adresse Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="exemple@mail.com"
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label>Mot de passe</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="••••••••"
              style={styles.input}
            />
          </div>

          <button type="submit" style={styles.button}>
            {isLogin ? 'Se connecter' : "S'inscrire"}
          </button>
        </form>

        {message && <p style={styles.success}>{message}</p>}
        {error && <p style={styles.error}>{error}</p>}

        <p style={styles.toggleText}>
          {isLogin ? "Nouveau sur l'application ?" : "Déjà un compte ?"}
          <span onClick={() => setIsLogin(!isLogin)} style={styles.toggleLink}>
            {isLogin ? " Créer un compte" : " Se connecter"}
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '50px' },
  card: { padding: '30px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: '#fff', width: '100%', maxWidth: '400px' },
  title: { textAlign: 'center', marginBottom: '20px', color: '#333' },
  form: { display: 'flex', flexDirection: 'column' },
  inputGroup: { marginBottom: '15px', display: 'flex', flexDirection: 'column' },
  input: { padding: '10px', borderRadius: '4px', border: '1px solid #ccc', marginTop: '5px', fontSize: '16px' },
  button: { padding: '12px', borderRadius: '4px', border: 'none', backgroundColor: '#007bff', color: '#fff', fontSize: '16px', cursor: 'pointer', marginTop: '10px' },
  success: { color: 'green', textAlign: 'center', marginTop: '15px', fontWeight: 'bold' },
  error: { color: 'red', textAlign: 'center', marginTop: '15px', fontWeight: 'bold' },
  toggleText: { textAlign: 'center', marginTop: '20px', fontSize: '14px' },
  toggleLink: { color: '#007bff', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }
};