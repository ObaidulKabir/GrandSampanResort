/** @type {import('next').NextConfig} */

// Required environment variables validation
const requiredEnvVars = ["NEXT_PUBLIC_API_URL", "DOMAIN"];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`❌ Missing required environment variable: ${envVar}`);
  }
}

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      "res.cloudinary.com",
      "localhost",
      process.env.DOMAIN,
      "grand-sampan-resort.unitechholdingsltd.com",
    ],
  },
};
export default nextConfig;
