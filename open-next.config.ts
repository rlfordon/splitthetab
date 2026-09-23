import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Every page reads live trip data, so no incremental cache (and no R2 bucket) is needed.
export default defineCloudflareConfig({});
