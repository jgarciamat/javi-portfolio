import type { StatusMsg } from '../application/useProfileSections';

export function StatusMessage({ message }: { message: StatusMsg | null }) {
  if (!message) return null;
  return (
    <p
      className={message.ok ? 'profile-msg-ok' : 'auth-error'}
      role={message.ok ? 'status' : 'alert'}
    >
      {message.text}
    </p>
  );
}
