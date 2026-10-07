import { useEffect, useState } from 'react';
import './App.css';

function App() {

  const [loggedIn, setLoggedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [names, setNames] = useState([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const fetchNames = () => {
    setLoading(true);
    return fetch('/bff/api/names', { credentials: 'include' })
      .then((res) => {
        if (res.status === 401) {
         
          setLoggedIn(false);
          return null;
        }
        if (!res.ok) throw new Error('Failed to fetch names');
        setLoggedIn(true);
        return res.json();
      })
      .then((data) => {
        if (data) {
          setNames(data.names);
          setError(null);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };


  useEffect(() => {
    fetchNames().finally(() => setCheckingSession(false));
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    try {
      const res = await fetch('/bff/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) throw new Error('Invalid username or password');
      setPassword('');
      setLoggedIn(true);
      await fetchNames();
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/bff/logout', { method: 'POST', credentials: 'include' });
    setLoggedIn(false);
    setNames([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/bff/api/names', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.status === 401) {
        setLoggedIn(false);
        return;
      }
      if (!res.ok) throw new Error('Failed to add name');
      setNewName('');
      await fetchNames();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="App">
        <header className="App-header">
          <p>Loading...</p>
        </header>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Log in</h1>
          <form onSubmit={handleLogin}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              disabled={loggingIn}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              disabled={loggingIn}
            />
            <button type="submit" disabled={loggingIn || !username || !password}>
              {loggingIn ? 'Logging in...' : 'Log in'}
            </button>
          </form>
          {loginError && <p style={{ color: 'salmon' }}>{loginError}</p>}
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Names</h1>
        <button onClick={handleLogout}>Log out</button>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Enter a name"
            disabled={submitting}
          />
          <button type="submit" disabled={submitting || !newName.trim()}>
            {submitting ? 'Adding...' : 'Add Name'}
          </button>
        </form>

        {error && <p style={{ color: 'salmon' }}>{error}</p>}

        {loading ? (
          <p>Loading...</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {names.map((n) => (
              <li key={n.id}>{n.name}</li>
            ))}
          </ul>
        )}
      </header>
    </div>
  );
}

export default App;
