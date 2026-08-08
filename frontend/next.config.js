/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
