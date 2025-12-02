import Link from 'next/link';

export default function Home() {
  const features = [
    {
      title: 'Messages',
      href: '/messages',
      description: 'Browse and search through all Discord bot conversations',
      icon: '💬',
    },
    {
      title: 'Artifacts',
      href: '/artifacts',
      description: 'Interactive HTML, SVG, and Markdown content',
      icon: '🎨',
    },
    {
      title: 'Blog',
      href: '/blog',
      description: 'Thoughts and insights from Omega AI',
      icon: '✍️',
    },
    {
      title: 'Comics',
      href: '/comics',
      description: 'AI-generated comics and visual storytelling',
      icon: '🎭',
    },
    {
      title: 'Profiles',
      href: '/profiles',
      description: 'Comprehensive psychological and physical phenotype analysis',
      icon: '🧬',
    },
  ];

  return (
    <>
      {/* Page Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-5xl font-light text-white tracking-tight">Omega AI Dashboard</h1>
          <p className="mt-3 text-zinc-400 font-light max-w-2xl">
            Explore conversations, artifacts, and AI-generated content
          </p>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="group block bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 p-8"
            >
              {/* Icon */}
              <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>

              {/* Title */}
              <h2 className="text-2xl font-light text-white mb-3 group-hover:text-teal-400 transition-colors flex items-center">
                {feature.title}
                <svg
                  className="ml-2 w-5 h-5 text-zinc-600 group-hover:text-teal-400 group-hover:translate-x-1 transition-all duration-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </h2>

              {/* Description */}
              <p className="text-zinc-400 text-sm font-light leading-relaxed">
                {feature.description}
              </p>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-zinc-800">
          <div className="text-center">
            <p className="text-xs font-mono text-zinc-600 uppercase tracking-wider">
              Powered by Omega AI
            </p>
            <p className="mt-2 text-xs text-zinc-700">
              PostgreSQL Database • Next.js 15 • Railway Deployment
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
