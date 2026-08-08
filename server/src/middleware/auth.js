import jwt from 'jsonwebtoken';

export function signToken(payload, expiresIn = '12h') {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

export function requireAuth(roles = []) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ message: '권한이 없습니다.' });
      }
      req.user = decoded;
      return next();
    } catch {
      return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }
  };
}

export function requireFacilityMatch(paramName = 'facilityCode') {
  return (req, res, next) => {
    if (req.user?.role === 'system_admin') return next();
    const code = req.params[paramName] || req.params.facility_code;
    if (req.user?.facilityCode && code && req.user.facilityCode !== code) {
      return res.status(403).json({ message: '다른 시설사 데이터에 접근할 수 없습니다.' });
    }
    return next();
  };
}
