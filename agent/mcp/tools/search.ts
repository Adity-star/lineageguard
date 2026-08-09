import { z } from 'zod';

import { MCPClient } from '../client.js';
import { MCPToolResponse, SearchResult, SearchResultSchema } from '../types.js';

const SearchResponseSchema = z.array(SearchResultSchema);

export interface SearchOptions {
  query: string;
  entityTypes?: string[];
  limit?: number;
}

export class SearchTool {
  constructor(private readonly client: MCPClient) {}

  public async searchDatasets(
    query: string,
    limit = 10,
  ): Promise<MCPToolResponse<SearchResult[]>> {
    const start = performance.now();

    const client = this.client['transport'].getClient();

    const response: any = await client.callTool({
      name: 'search',
      arguments: {
        query,
      },
    });

    const structured = response.structuredContent;

    const results: SearchResult[] = (structured.searchResults ?? [])
      .map((item: any) => {
        const urn = item.entity?.urn;

        const name =
          item.entity?.properties?.name ??
          urn?.split(',')[1]?.replace(')', '') ??
          'Unknown';

        const entityType = urn?.includes(':dataset:')
          ? 'dataset'
          : urn?.includes(':dashboard:')
            ? 'dashboard'
            : urn?.includes(':chart:')
              ? 'chart'
              : urn?.includes(':dataJob:')
                ? 'dataJob'
                : urn?.includes(':mlModel:')
                  ? 'mlModel'
                  : 'dataset';

        return {
          urn,
          name,
          entityType,
          score: 1,
        };
      })
      .slice(0, limit);

    return {
      tool: 'search',
      durationMs: performance.now() - start,
      data: results,
    };
  }

  public async searchWithResponse(
    options: SearchOptions,
  ): Promise<MCPToolResponse<SearchResult[]>> {
    const start = performance.now();

    const response = await this.client.executeTool<any>(
      'search',
      options as unknown as Record<string, unknown>,
      SearchResponseSchema,
    );

    return {
      tool: 'search',
      durationMs: performance.now() - start,
      data: response.data,
    };
  }

  public async search(options: SearchOptions): Promise<SearchResult[]> {
    const raw = await this.client.executeTool<any>(
      'search',
      options as unknown as Record<string, unknown>,
      SearchResponseSchema,
    );
    return raw.data;
  }

  public async autocomplete(options: SearchOptions): Promise<SearchResult[]> {
    const raw = await this.client.executeTool<any>(
      'autocomplete',
      options as unknown as Record<string, unknown>,
      SearchResponseSchema,
    );
    return raw.data;
  }
}
