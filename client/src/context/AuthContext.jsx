import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [facilityUser, setFacilityUser] = useState(() => {
    const raw = localStorage.getItem('tb_facility_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [systemUser, setSystemUser] = useState(() => {
    const raw = localStorage.getItem('tb_system_user');
    return raw ? JSON.parse(raw) : null;
  });

  const logoutFacility = () => {
    localStorage.removeItem('tb_facility_token');
    localStorage.removeItem('tb_facility_user');
    setFacilityUser(null);
  };

  const logoutSystem = () => {
    localStorage.removeItem('tb_system_token');
    localStorage.removeItem('tb_system_user');
    setSystemUser(null);
  };

  useEffect(() => {
    const onExpired = (e) => {
      if (e.detail?.scope === 'system') logoutSystem();
      else logoutFacility();
    };
    window.addEventListener('tb:auth-expired', onExpired);
    return () => window.removeEventListener('tb:auth-expired', onExpired);
  }, []);

  const value = useMemo(
    () => ({
      facilityUser,
      systemUser,
      loginFacility(token, user) {
        localStorage.setItem('tb_facility_token', token);
        localStorage.setItem('tb_facility_user', JSON.stringify(user));
        setFacilityUser(user);
      },
      logoutFacility,
      loginSystem(token, user) {
        localStorage.setItem('tb_system_token', token);
        localStorage.setItem('tb_system_user', JSON.stringify(user));
        setSystemUser(user);
      },
      logoutSystem,
    }),
    [facilityUser, systemUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
