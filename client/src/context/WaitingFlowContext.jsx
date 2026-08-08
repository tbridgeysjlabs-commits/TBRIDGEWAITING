import { createContext, useContext, useMemo, useState } from 'react';

const WaitingFlowContext = createContext(null);
const DEFAULT_PHONE = '010';

export function WaitingFlowProvider({ children }) {
  const [phone, setPhone] = useState(DEFAULT_PHONE);
  const [partyCounts, setPartyCounts] = useState({});
  const [lang, setLang] = useState('ko');

  const value = useMemo(
    () => ({
      phone,
      setPhone,
      partyCounts,
      setPartyCounts,
      lang,
      setLang,
      reset() {
        setPhone(DEFAULT_PHONE);
        setPartyCounts({});
      },
    }),
    [phone, partyCounts, lang]
  );

  return (
    <WaitingFlowContext.Provider value={value}>{children}</WaitingFlowContext.Provider>
  );
}

export function useWaitingFlow() {
  return useContext(WaitingFlowContext);
}
