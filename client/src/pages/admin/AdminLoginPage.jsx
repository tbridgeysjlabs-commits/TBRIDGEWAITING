import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function AdminLoginPage() {
  const { facilityCode } = useParams();
  const navigate = useNavigate();
  const { loginFacility } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api(`/admin/${facilityCode}/login`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      loginFacility(result.token, result.user);
      navigate(`/admin/${facilityCode}/waiting`);
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
        <h1>시설사 관리자 로그인</h1>
        <p className="muted">시설 코드: {facilityCode}</p>
        <label>
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
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
