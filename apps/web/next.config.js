/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Transpile workspace packages
  transpilePackages: ['@repo/database', '@repo/shared', '@repo/ui'],

  // Environment variables to expose to the client
  env: {
    NEXT_PUBLIC_APP_NAME: 'Omega Web',
  },

  // Webpack configuration to handle native modules and README files
  webpack: (config, { isServer }) => {
    // Externalize native bindings and optional dependencies for server-side
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'libsql': 'commonjs libsql',
        '@libsql/client': 'commonjs @libsql/client',
        'mongodb': 'commonjs mongodb',
        'pg': 'commonjs pg',
        'aws4': 'commonjs aws4', // MongoDB optional dependency
      });
    }

    // Ignore README and LICENSE files
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.(md|LICENSE)$/,
      type: 'asset/source',
    });

    // Ignore native .node files
    config.module.rules.push({
      test: /\.node$/,
      loader: 'node-loader',
    });

    return config;
  },
};

module.exports = nextConfig;
