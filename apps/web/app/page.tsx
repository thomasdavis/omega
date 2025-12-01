export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4">Omega Web</h1>
        <p className="text-lg mb-8">
          Discord bot web interface for artifacts, documents, and blog posts.
        </p>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <a
            href="/artifacts"
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100"
          >
            <h2 className="mb-2 text-2xl font-semibold">
              Artifacts{' '}
              <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                →
              </span>
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              View interactive HTML, SVG, and Markdown artifacts
            </p>
          </a>

          <a
            href="/documents"
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100"
          >
            <h2 className="mb-2 text-2xl font-semibold">
              Documents{' '}
              <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                →
              </span>
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              Browse live documents and Slidev presentations
            </p>
          </a>

          <a
            href="/blog"
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100"
          >
            <h2 className="mb-2 text-2xl font-semibold">
              Blog{' '}
              <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                →
              </span>
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              Read daily insights on philosophy and markets
            </p>
          </a>
        </div>
      </div>
    </main>
  );
}
