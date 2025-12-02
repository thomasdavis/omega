export default function Home() {
  const features = [
    {
      title: 'Messages',
      href: '/messages',
      description: 'Explore all Discord bot conversations with advanced filters and search',
      icon: '💬',
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50',
    },
    {
      title: 'Artifacts',
      href: '/artifacts',
      description: 'View interactive HTML, SVG, and Markdown artifacts created by the bot',
      icon: '🎨',
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-50 to-pink-50',
    },
    {
      title: 'Documents',
      href: '/documents',
      description: 'Browse and collaborate on live documents and Slidev presentations',
      icon: '📄',
      gradient: 'from-emerald-500 to-teal-500',
      bgGradient: 'from-emerald-50 to-teal-50',
    },
    {
      title: 'Blog',
      href: '/blog',
      description: 'Read daily insights on philosophy, markets, and AI-generated content',
      icon: '✍️',
      gradient: 'from-orange-500 to-red-500',
      bgGradient: 'from-orange-50 to-red-50',
    },
    {
      title: 'Comics',
      href: '/comics',
      description: 'Enjoy AI-generated comics and visual storytelling',
      icon: '🎭',
      gradient: 'from-indigo-500 to-purple-500',
      bgGradient: 'from-indigo-50 to-purple-50',
    },
    {
      title: 'Profiles',
      href: '/profiles',
      description: 'Explore comprehensive psychological and physical profiles',
      icon: '🧬',
      gradient: 'from-teal-500 to-emerald-500',
      bgGradient: 'from-teal-50 to-emerald-50',
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="inline-block mb-6">
              <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-full shadow-lg border border-slate-200">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-slate-700">System Online</span>
              </div>
            </div>

            <h1 className="text-6xl md:text-7xl font-bold text-slate-900 mb-6 tracking-tight">
              Omega<span className="bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text"> AI</span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-600 mb-4 max-w-3xl mx-auto leading-relaxed">
              Discord bot intelligence platform
            </p>

            <p className="text-base text-slate-500 max-w-2xl mx-auto">
              Explore conversations, artifacts, documents, and AI-generated content through a beautiful, modern interface
            </p>

            {/* Quick Stats */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
                <div className="text-3xl font-bold text-blue-600">💬</div>
                <div className="mt-2 text-sm text-slate-600">Messages</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
                <div className="text-3xl font-bold text-purple-600">🎨</div>
                <div className="mt-2 text-sm text-slate-600">Artifacts</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
                <div className="text-3xl font-bold text-emerald-600">📄</div>
                <div className="mt-2 text-sm text-slate-600">Documents</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
                <div className="text-3xl font-bold text-orange-600">✍️</div>
                <div className="mt-2 text-sm text-slate-600">Blog Posts</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <a
              key={feature.title}
              href={feature.href}
              className="group relative bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              {/* Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

              {/* Content */}
              <div className="relative p-8">
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} text-white text-3xl mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-slate-900 mb-3 flex items-center">
                  {feature.title}
                  <svg
                    className="ml-2 w-5 h-5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all duration-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </h2>

                {/* Description */}
                <p className="text-slate-600 leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover Effect Line */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}></div>
              </div>
            </a>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-16 bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Lightning Fast</h3>
              <p className="text-sm text-slate-600">Built on Next.js and PostgreSQL for instant data access</p>
            </div>

            <div className="text-center md:text-left">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Powerful Search</h3>
              <p className="text-sm text-slate-600">Advanced filtering and full-text search across all data</p>
            </div>

            <div className="text-center md:text-left">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-xl mb-4">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Always Updated</h3>
              <p className="text-sm text-slate-600">Real-time sync with Discord bot activity</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-slate-500">
          <p>Powered by Omega AI • PostgreSQL Database • Next.js 15</p>
        </div>
      </div>
    </main>
  );
}
