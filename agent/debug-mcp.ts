import { StdioMCPTransport } from "../agent/mcp/studio-transport.js";
import { MCPClient } from "./mcp/client.js";

async function main() {
  const transport = new StdioMCPTransport({
    command:
      "C:\\Users\\Administrator\\lineageguard\\datahub311\\Scripts\\python.exe",
    args: ["-m", "mcp_server_datahub"],
  });

  const client = new MCPClient(transport);

  await client.initialize();

  const raw = await transport
    .getClient()
    .callTool({
      name: "search",
      arguments: {
        query: "sample",
      },
    });

  console.log("\n========== RAW RESPONSE ==========\n");

  console.dir(raw, {
    depth: null,
    colors: true,
  });

  await client.shutdown();
}

main().catch(console.error);