interface EmptyStateProps {
  icon: string;
  text: string;
}

export function EmptyState({ icon, text }: EmptyStateProps) {
  return (
    <div className="empty-block">
      <div className="empty-block-icon" aria-hidden="true">
        {icon}
      </div>
      <p className="empty-block-text">{text}</p>
    </div>
  );
}
