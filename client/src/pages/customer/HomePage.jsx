import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useWaitingFlow } from '../../context/WaitingFlowContext';
import NumericKeypad from '../../components/customer/NumericKeypad';
import { PrimaryButton } from '../../components/customer/ActionButtons';

const PREFIX = '010';

/** 빈값 허용. 010 접두사도 백스페이스로 전부 삭제 가능 */
function displayPhone(digits) {
  const raw = (digits || '').replace(/\D/g, '').slice(0, 11);
  if (!raw) return '';
  if (raw.startsWith(PREFIX)) {
    const rest = raw.slice(PREFIX.length);
    if (!rest) return '010 - ';
    if (rest.length <= 4) return `010 - ${rest}`;
    return `010 - ${rest.slice(0, 4)} - ${rest.slice(4, 8)}`;
  }
  if (raw.length <= 3) return raw;
  if (raw.length <= 7) return `${raw.slice(0, 3)} - ${raw.slice(3)}`;
  return `${raw.slice(0, 3)} - ${raw.slice(3, 7)} - ${raw.slice(7)}`;
}

export default function HomePage() {
  const { facilityCode } = useParams();
  const navigate = useNavigate();
  const { t } = useOutletContext();
  const { phone, setPhone } = useWaitingFlow();

  const digits = phone.replace(/\D/g, '').slice(0, 11);
  const valid = /^01[016789]\d{7,8}$/.test(digits);

  const onKey = (key) => {
    if (key === 'reset') {
      setPhone('');
      return;
    }
    if (key === 'back') {
      setPhone(digits.slice(0, -1));
      return;
    }
    if (digits.length >= 11) return;
    setPhone(digits + key);
  };

  return (
    <div className="w-full max-w-[690px] rounded-[54px] bg-white p-[42px] shadow-[0_36px_90px_rgba(120,100,180,0.12)] xl:p-[60px]">
      <div className="mb-3 min-h-[1.2em] text-center text-[51px] font-extrabold tracking-wide text-[#3a3550] xl:text-[60px]">
        {displayPhone(digits) || '\u00A0'}
      </div>
      <p className="mb-12 text-center text-[21px] text-gray-400 xl:text-[22px]">
        {t('phone_hint')}
      </p>

      <NumericKeypad onKey={onKey} />

      <PrimaryButton
        className="mt-12 w-full py-6 text-[22px]"
        disabled={!valid}
        onClick={() => navigate(`/w/${facilityCode}/party`)}
      >
        {t('start_waiting')}
      </PrimaryButton>
    </div>
  );
}
