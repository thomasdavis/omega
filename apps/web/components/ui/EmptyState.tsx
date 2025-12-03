interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  icon = '📭',
  title,
  description,
  action
}: EmptyStateProps) {
  return (
    <div className="text-center py-20">
      <div className="text-6xl mb-6">{icon}</div>
      <h3 className="text-zinc-600 text-xl font-light mb-2">{title}</h3>
      {description && (
        <p className="text-zinc-500 text-sm max-w-md mx-auto">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
