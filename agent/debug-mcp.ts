import { StdioMCPTransport } from '../agent/mcp/studio-transport.js';
import { MCPClient } from './mcp/client.js';

const DATASET_URN =
  'urn:li:dataset:(urn:li:dataPlatform:hdfs,SampleHdfsDataset,PROD)';

async function testTool(
  transport: StdioMCPTransport,
  name: string,
  args: Record<string, any>,
) {
  console.log('\n' + '='.repeat(80));
  console.log(`TOOL: ${name}`);
  console.log('='.repeat(80));
  console.log('\nARGUMENTS:');
  console.dir(args, { depth: null, colors: true });

  try {
    const raw = await transport.getClient().callTool({
      name,
      arguments: args,
    });

    console.log('\n' + '-'.repeat(80));
    console.log('RAW RESPONSE:');
    console.log('-'.repeat(80));
    console.dir(raw, {
      depth: null,
      colors: true,
    });

    if ((raw as any)?.content?.length) {
      console.log('\n' + '-'.repeat(80));
      console.log('CONTENT ARRAY:');
      console.log('-'.repeat(80));
      for (const item of (raw as any).content) {
        console.dir(item, {
          depth: null,
          colors: true,
        });
      }
    }

    if ((raw as any)?.structuredContent) {
      console.log('\n' + '-'.repeat(80));
      console.log('STRUCTURED CONTENT:');
      console.log('-'.repeat(80));
      console.dir((raw as any).structuredContent, {
        depth: null,
        colors: true,
      });
    }

    if ((raw as any)?.error) {
      console.log('\n' + '-'.repeat(80));
      console.log('ERROR:');
      console.log('-'.repeat(80));
      console.dir((raw as any).error, {
        depth: null,
        colors: true,
      });
    }
  } catch (err) {
    console.log('\n' + '-'.repeat(80));
    console.log('ERROR (EXCEPTION):');
    console.log('-'.repeat(80));
    console.dir(err, {
      depth: null,
      colors: true,
    });
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

async function main() {
  const transport = new StdioMCPTransport({
    command:
      'C:\\Users\\Administrator\\lineageguard\\datahub311\\Scripts\\python.exe',
    args: ['-m', 'mcp_server_datahub'],
  });

  const client = new MCPClient(transport);

  await client.initialize();

  // -------------------------------------------------------
  // List all available tools
  // -------------------------------------------------------
  console.log('\n' + '='.repeat(80));
  console.log('AVAILABLE TOOLS:');
  console.log('='.repeat(80) + '\n');

  const tools = await transport.getClient().listTools();
  console.dir(tools, { depth: null, colors: true });

  console.log('\n' + '='.repeat(80));
  console.log('TOOL NAMES:');
  console.log('='.repeat(80) + '\n');

  const toolNames = tools.tools.map((t) => t.name);
  console.dir(toolNames, { depth: null, colors: true });

  console.log('\n' + '='.repeat(80));
  console.log('TESTING ALL TOOLS:');
  console.log('='.repeat(80) + '\n');

  // -------------------------------------------------------
  // Test each tool with appropriate arguments
  // -------------------------------------------------------

  // Only test tools that actually exist
  if (toolNames.includes('search')) {
    await testTool(transport, 'search', {
      query: 'sample',
    });
  }

  // Search for existing tags to use for testing
  if (toolNames.includes('search')) {
    await testTool(transport, 'search', {
      query: 'tag',
      types: ['TAG'],
    });
  }

  // Search for existing structured properties
  if (toolNames.includes('search')) {
    await testTool(transport, 'search', {
      query: 'structuredProperty',
      types: ['STRUCTURED_PROPERTY'],
    });
  }

  if (toolNames.includes('get_dataset')) {
    await testTool(transport, 'get_dataset', {
      urn: DATASET_URN,
    });
  }

  if (toolNames.includes('get_entity')) {
    await testTool(transport, 'get_entity', {
      urn: DATASET_URN,
    });
  }

  if (toolNames.includes('get_schema')) {
    await testTool(transport, 'get_schema', {
      urn: DATASET_URN,
    });
  }

  if (toolNames.includes('get_lineage')) {
    await testTool(transport, 'get_lineage', {
      urn: DATASET_URN,
    });
  }

  if (toolNames.includes('update_description')) {
    await testTool(transport, 'update_description', {
      entity_urn: DATASET_URN,
      operation: 'replace',
      description: 'Testing update_description response',
    });
  }

  // Skip add_tags - requires actual tags that don't exist
  // if (toolNames.includes("add_tags")) {
  //   await testTool(transport, "add_tags", {
  //     entity_urns: [DATASET_URN],
  //     tag_urns: [],
  //   });
  // }

  // Skip remove_tags - requires actual tags that don't exist
  // if (toolNames.includes("remove_tags")) {
  //   await testTool(transport, "remove_tags", {
  //     entity_urns: [DATASET_URN],
  //     tag_urns: [],
  //   });
  // }

  // Skip add_terms - requires actual glossary terms that don't exist
  // if (toolNames.includes("add_terms")) {
  //   await testTool(transport, "add_terms", {
  //     entity_urns: [DATASET_URN],
  //     term_urns: [],
  //   });
  // }

  // Skip remove_terms - requires actual glossary terms that don't exist
  // if (toolNames.includes("remove_terms")) {
  //   await testTool(transport, "remove_terms", {
  //     entity_urns: [DATASET_URN],
  //     term_urns: [],
  //   });
  // }

  // Skip add_owners - requires actual owner URNs that don't exist
  // if (toolNames.includes("add_owners")) {
  //   await testTool(transport, "add_owners", {
  //     entity_urns: [DATASET_URN],
  //     owner_urns: [],
  //     ownership_type: "TECHNICAL_OWNER",
  //   });
  // }

  // Skip remove_owners - requires actual owner URNs that don't exist
  // if (toolNames.includes("remove_owners")) {
  //   await testTool(transport, "remove_owners", {
  //     entity_urns: [DATASET_URN],
  //     owner_urns: [],
  //     ownership_type: "TECHNICAL_OWNER",
  //   });
  // }

  if (toolNames.includes('add_domain')) {
    await testTool(transport, 'add_domain', {
      entity_urns: [DATASET_URN],
      domain_urn: '',
    });
  }

  if (toolNames.includes('remove_domain')) {
    await testTool(transport, 'remove_domain', {
      entity_urns: [DATASET_URN],
    });
  }

  if (toolNames.includes('add_structured_properties')) {
    await testTool(transport, 'add_structured_properties', {
      entity_urns: [DATASET_URN],
      property_values: {
        'urn:li:structuredProperty:test': ['hello'],
      },
    });
  }

  if (toolNames.includes('remove_structured_properties')) {
    await testTool(transport, 'remove_structured_properties', {
      entity_urns: [DATASET_URN],
      property_urns: ['urn:li:structuredProperty:test'],
    });
  }

  if (toolNames.includes('get_documents')) {
    await testTool(transport, 'get_documents', {
      urn: DATASET_URN,
    });
  }

  if (toolNames.includes('add_document')) {
    await testTool(transport, 'add_document', {
      urn: DATASET_URN,
      document_url: 'https://example.com',
      document_name: 'Test Document',
      description: 'Test description',
    });
  }

  if (toolNames.includes('remove_document')) {
    await testTool(transport, 'remove_document', {
      urn: DATASET_URN,
      document_url: 'https://example.com',
    });
  }

  await client.shutdown();
}

main().catch(console.error);
