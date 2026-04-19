import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/welcome", destination: "/clubhouse", permanent: true },
      { source: "/learn", destination: "/guides", permanent: true },
      { source: "/learn/:path*", destination: "/guides/:path*", permanent: true },
      { source: "/courses", destination: "/home-courses", permanent: true },
      { source: "/courses/:path*", destination: "/home-courses/:path*", permanent: true },
      { source: "/plan", destination: "/bag", permanent: true },
      { source: "/plan/:path*", destination: "/bag/:path*", permanent: true },
      { source: "/library", destination: "/bag", permanent: true },
      { source: "/library/:path*", destination: "/bag/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
