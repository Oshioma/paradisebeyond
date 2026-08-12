/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Demo imagery is generated locally by /api/placeholder (SVG), so image
    // optimisation is disabled to serve it directly. When you point
    // src/lib/images.ts at a real media CDN (Supabase Storage / Cloudinary),
    // set `unoptimized: false` and add the CDN host to `remotePatterns` below
    // to get automatic resizing, format negotiation and lazy loading.
    unoptimized: true,
    remotePatterns: [
      // { protocol: "https", hostname: "<your-project>.supabase.co" },
    ],
  },
};

export default nextConfig;
