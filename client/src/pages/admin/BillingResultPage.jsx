import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function BillingResultPage() {
  const { facilityCode } = useParams();
  const [params] = useSearchParams();
  const { facilityUser } = useAuth();
  const status = params.get('status') || 'fail';
  const message = params.get('message') || '';
  const success = status === 'success';

  if (!facilityUser || facilityUser.facilityCode !== facilityCode) {
    return <Navigate to={`/admin/${facilityCode}/login`} replace />;
  }

  return (
    <div className="center-page" style={{ padding: 24 }}>
      <div
        className="login-card"
        style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}
      >
        <h1 style={{ marginTop: 0 }}>{success ? '충전 완료' : '충전 실패'}</h1>
        <p style={{ color: success ? '#166534' : '#b91c1c', fontWeight: 600 }}>
          {message || (success ? '나이스페이 결제가 완료되었습니다.' : '결제에 실패했습니다.')}
        </p>
        <Link
          className="btn-primary"
          to={`/admin/${facilityCode}/billing`}
          style={{ display: 'inline-block', marginTop: 16, textDecoration: 'none' }}
        >
          알림톡 충전 페이지로 이동
        </Link>
      </div>
    </div>
  );
}
