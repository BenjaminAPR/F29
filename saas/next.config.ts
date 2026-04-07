import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    // Evita que Next tome el lockfile del repo padre (F29/) como raíz del workspace.
    root: process.cwd(),
  },
};

export default nextConfig;
