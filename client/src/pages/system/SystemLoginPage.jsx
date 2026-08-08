import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function SystemLoginPage() {
  const navigate = useNavigate();
  const { loginSystem } = useAuth();
  const [username, setUsername] = useState('sysadmin');
  const [password, setPassword] = useState('admin1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api(
        '/system-admin/login',
        {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        },
        'system'
      );
      loginSystem(result.token, result.user);
      navigate('/system-admin/facilities');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="sidebar-logo center">
          <img src="/tbridge_logo.png" alt="T BRIDGE" />
        </div>
        <h1>시스템 관리자 로그인</h1>
        <label>
          아이디
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label>
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary full" disabled={loading}>
          로그인
        </button>
      </form>
    </div>
  );
}
