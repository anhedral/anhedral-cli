# Private files

FILES is a private R2 Worker binding. Authenticate the request and enforce file-level product authorization before calling get/put/delete. No public buckets, R2 keys, generic download endpoints, or client credentials are generated. Use the binding directly in Hono or import env from cloudflare:workers in Vinext; explicit OpenNext uses getCloudflareContext.
