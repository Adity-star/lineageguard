import { MCPClient } from '../agent/mcp/client.js';
import { DataHubClient } from '../agent/mcp/datahub-client.js';
import { StdioMCPTransport } from '../agent/mcp/studio-transport.js';

async function main() {
  const transport = new StdioMCPTransport({
    timeoutMs: 30000,
  });

  const client = new MCPClient(transport);
  const datahub = new DataHubClient(client);

  await datahub.initialize();

  console.log('✅ Connected to DataHub MCP');

  const datasets = await datahub.searchDatasets('sample', 5);

  console.log('Search Results:');
  console.dir(datasets, { depth: null });

  await datahub.shutdown();
}

main().catch(console.error);
