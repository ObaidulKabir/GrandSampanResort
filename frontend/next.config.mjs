/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["res.cloudinary.com", "localhost", process.env.DOMAIN],
  },
};
module.exports = nextConfig;
