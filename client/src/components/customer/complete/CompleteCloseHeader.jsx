import CloseButton from '../CloseButton';

export default function CompleteCloseHeader({ onClose }) {
  return (
    <header className="relative mb-2 flex h-12 items-center justify-end">
      <CloseButton onClick={onClose} imgClassName="h-7 w-7" />
    </header>
  );
}
