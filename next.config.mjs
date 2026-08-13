/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Photo uploads go through a Server Action; the default body limit is 1 MB,
    // which silently stalls real photos. Allow up to the app's 8 MB image cap
    // (plus FormData overhead).
    serverActions: { bodySizeLimit: "10mb" },
  },
  async headers() {
    // Baseline security headers on every response. (No CSP yet — it needs
    // per-route tuning for Next's inline runtime and the Stripe redirect.)
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
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
