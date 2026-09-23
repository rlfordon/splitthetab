import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {};

export default nextConfig;

// Lets `next dev` reach Cloudflare bindings (the local D1 database) via getCloudflareContext().
initOpenNextCloudflareForDev();
