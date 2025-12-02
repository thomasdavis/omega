export default function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mb-4"></div>
        <p className="text-zinc-400 text-xl font-light tracking-wide">{message}</p>
      </div>
    </div>
  );
}
