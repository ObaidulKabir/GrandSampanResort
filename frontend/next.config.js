/** @type {import('next').NextConfig} */
function uploadsProxyTarget() {
  const raw =
    process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  return raw.replace(/\/+$/, '').replace(/\/api$/i, '');
}

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Proxy upload paths to the API origin. Prefer the internal Docker service
    // name at build time (see Dockerfile API_URL) so a missed Traefik /uploads
    // rule cannot loop back through the public Cloudflare hostname.
    const target = uploadsProxyTarget();
    return [
      {
        source: '/uploads/:path*',
        destination: `${target}/uploads/:path*`
      },
      {
        source: '/api/uploads/:path*',
        destination: `${target}/api/uploads/:path*`
      }
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com'
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
        pathname: '/uploads/**'
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4010',
        pathname: '/uploads/**'
      },
      {
        protocol: 'https',
        hostname: 'www.grandsampanresort.com',
        pathname: '/uploads/**'
      },
      {
        protocol: 'https',
        hostname: 'grandsampanresort.com',
        pathname: '/uploads/**'
      }
    ]
  }
};
module.exports = nextConfig;
