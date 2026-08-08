import { createContext, useContext, useMemo, useState } from 'react';

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

  const value = useMemo(
    () => ({
      facilityUser,
      systemUser,
      loginFacility(token, user) {
        localStorage.setItem('tb_facility_token', token);
        localStorage.setItem('tb_facility_user', JSON.stringify(user));
        setFacilityUser(user);
      },
      logoutFacility() {
        localStorage.removeItem('tb_facility_token');
        localStorage.removeItem('tb_facility_user');
        setFacilityUser(null);
      },
      loginSystem(token, user) {
        localStorage.setItem('tb_system_token', token);
        localStorage.setItem('tb_system_user', JSON.stringify(user));
        setSystemUser(user);
      },
      logoutSystem() {
        localStorage.removeItem('tb_system_token');
        localStorage.removeItem('tb_system_user');
        setSystemUser(null);
      },
    }),
    [facilityUser, systemUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
