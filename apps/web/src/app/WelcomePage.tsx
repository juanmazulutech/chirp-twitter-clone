import { useQuery } from '@tanstack/react-query';

async function fetchApiHealth(): Promise<{ status: string }> {
  const response = await fetch('/api/health');
  if (!response.ok) throw new Error(`API responded ${response.status}`);
  return (await response.json()) as { status: string };
}

/** Temporary landing page for the scaffold; replaced by the app shell and routes in C17. */
export function WelcomePage() {
  const health = useQuery({ queryKey: ['health'], queryFn: fetchApiHealth, retry: false });

  const apiStatus = health.isPending ? 'checking…' : health.isSuccess ? 'online' : 'offline';

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-4">
      <h1 className="text-3xl font-bold">Chirp</h1>
      <p>A calm, chronological microblog.</p>
      <p role="status">API: {apiStatus}</p>
    </main>
  );
}
