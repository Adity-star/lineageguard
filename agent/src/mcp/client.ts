import "dotenv/config";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

let client: Client | null = null;

export async function getDataHubClient() {
  if (client) return client;

  const transport = new StdioClientTransport({
    command: "mcp-server-datahub",
    env: {
      ...process.env,
      DATAHUB_GMS_URL: process.env.DATAHUB_GMS_URL!,
      DATAHUB_GMS_TOKEN: process.env.DATAHUB_GMS_TOKEN!,
    },
  });

  client = new Client({
    name: "lineageguard",
    version: "0.1.0",
  });

  await client.connect(transport);

  return client;
}