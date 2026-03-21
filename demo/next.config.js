const isGithubPages = process.env.DEPLOY_GITHUB_PAGES === 'true';

const nextConfig = {
  output: 'export',
  basePath: isGithubPages ? '/threespace' : '',
  assetPrefix: isGithubPages ? '/threespace/' : '',
  env: {
    NEXT_PUBLIC_BASE_PATH: isGithubPages ? '/threespace' : '',
  },
  reactStrictMode: true,
  swcMinify: false,
  transpilePackages: ['threespace'],
  experimental: { esmExternals: true, externalDir: true },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  webpack: (config) => {
    config.optimization.minimize = false;
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      use: ['raw-loader', 'glslify-loader'],
    });
    return config;
  },
};

export default nextConfig;
