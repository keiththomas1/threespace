const nextConfig = {
  output: 'export',
  basePath: '/threespace',
  assetPrefix: '/threespace/',
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['threespace'],
  experimental: { esmExternals: true, externalDir: true },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      use: ['raw-loader', 'glslify-loader'],
    });
    return config;
  },
};

export default nextConfig;
