const apiUrl = process.env.BRAVO_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';
if (!/^https?:\/\//.test(apiUrl)) {
  throw new Error('BRAVO_API_URL inválida');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@bravo-ii/contracts',
    '@bravo-ii/core-policy',
    '@bravo-ii/domain-p06',
    '@bravo-ii/sdk',
    '@bravo-ii/ui',
  ],
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: '/v1/:path*', destination: `${apiUrl}/v1/:path*` },
      { source: '/api/v1/:path*', destination: `${apiUrl}/api/v1/:path*` },
    ];
  },
};

export default nextConfig;
