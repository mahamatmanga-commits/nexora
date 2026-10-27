/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: import.meta.dirname,
  devIndicators: false,
  // Lint exécuté séparément (npm run typecheck) ; pas d’ESLint configuré dans ce projet.
  eslint: { ignoreDuringBuilds: true },
  // node:sqlite est un module natif de Node 22 : on le laisse hors du bundle serveur.
  serverExternalPackages: [],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals ?? []), { "node:sqlite": "commonjs node:sqlite" }];
    }
    return config;
  },
};

export default nextConfig;
