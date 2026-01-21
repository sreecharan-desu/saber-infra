import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('jwt_token'));
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const API_BASE = 'https://saber-api-backend.vercel.app/api';
  
  // Configuration
  const GOOGLE_CLIENT_ID = '942388377321-su1u7ofm0ck76pvkiv07ksl8k9esfls6.apps.googleusercontent.com';
  // Note: For localhost testing, we'll try to use localhost redirect. 
  // If this isn't in Google Console, user might need to use the backend redirect and copy code manually.
  const REDIRECT_URI = window.location.origin + '/auth/callback'; 
  const BACKEND_REDIRECT_URI = 'https://saber-api-backend.vercel.app/api/auth/oauth/callback';

  // Automatically handle validation code return from backend redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      exchangeCode(code);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const loginWithGoogle = () => {
    // We try to popup or redirect. Let's redirect.
    // Use backend redirect URI to ensure it works since we know that's whitelisted
    const targetRedirect = BACKEND_REDIRECT_URI;
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${targetRedirect}&response_type=code&scope=openid%20email`;
    window.location.href = authUrl;
  };

  const exchangeCode = async (code: string, provider: string = 'google') => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/auth/oauth/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, code })
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Failed to exchange token');

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('jwt_token', data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('jwt_token');
    setToken(null);
    setUser(null);
  };

  return (
    <div className="container">
      <h1>🔐 SABER OAuth Client Test</h1>
      
      {token ? (
        <div className="card logged-in">
          <h2>✅ Authenticated!</h2>
          <div className="user-info">
            {user && (
              <>
                <p><strong>Name:</strong> {user.name}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Role:</strong> {user.role}</p>
              </>
            )}
            <div className="token-box">
              <h3>JWT Token:</h3>
              <pre>{token}</pre>
              <button onClick={() => navigator.clipboard.writeText(token)}>Copy Token</button>
            </div>
            <button className="logout-btn" onClick={logout}>Logout</button>
          </div>
        </div>
      ) : (
        <div className="card login-box">
          <p>Test the OAuth flow just like the real frontend.</p>
          
          <div className="buttons">
            <button className="google-btn" onClick={loginWithGoogle}>
              Sign in with Google
            </button>
          </div>

          <div className="manual-entry">
            <h3>Manual Code Entry</h3>
            <p className="hint">If you are redirected to the backend success page, copy the code and paste it here:</p>
            <input 
              type="text" 
              value={manualCode} 
              onChange={(e) => setManualCode(e.target.value)} 
              placeholder="Paste Authorization Code"
            />
            <button 
              onClick={() => exchangeCode(manualCode)}
              disabled={!manualCode || loading}
            >
              {loading ? 'Exchanging...' : 'Exchange Code'}
            </button>
          </div>

          {error && <div className="error-message">⚠️ {error}</div>}
        </div>
      )}
    </div>
  );
}

export default App;
