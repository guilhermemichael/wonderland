import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Plain static files: no server, no backend, deployable on any host.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  // a stray lockfile in the user's home folder must not become the root
  turbopack: { root: process.cwd() },
};

export default nextConfig;
