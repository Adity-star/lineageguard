import "dotenv/config";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const transport = new StdioClientTransport({
    command: "mcp-server-datahub",
    env: {
      ...process.env,
      DATAHUB_GMS_URL: process.env.DATAHUB_GMS_URL!,
      DATAHUB_GMS_TOKEN: process.env.DATAHUB_GMS_TOKEN!,
    },
  });

  const client = new Client({
    name: "lineageguard",
    version: "0.1.0",
  });

  await client.connect(transport);

  console.log("Connected\n");

  const result = await client.callTool({
    name: "search",
    arguments: {
      query: "sample",
    },
  });

  console.log(JSON.stringify(result, null, 2));

  await client.close();
}

main().catch(console.error);