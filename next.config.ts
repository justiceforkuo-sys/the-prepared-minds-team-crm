import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Métadonnées OAuth du connecteur Claude (MCP), servies à leur adresse officielle /.well-known/…
  async rewrites() {
    return [
      { source: "/.well-known/oauth-authorization-server", destination: "/api/mcp/well-known/authorization-server" },
      { source: "/.well-known/oauth-protected-resource", destination: "/api/mcp/well-known/protected-resource" },
      { source: "/.well-known/oauth-protected-resource/api/mcp", destination: "/api/mcp/well-known/protected-resource" },
      { source: "/.well-known/oauth-authorization-server/api/mcp", destination: "/api/mcp/well-known/authorization-server" },
    ];
  },
};

export default nextConfig;
