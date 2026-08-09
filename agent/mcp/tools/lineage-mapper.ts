import { logger } from '../../config/logger.js';
import {
  Lineage,
  LineageNode,
  LineageNodeSchema,
  LineageSchema,
} from '../types.js';

/**
 * Maps DataHub MCP server lineage responses to internal Lineage model.
 *
 * Handles variations in lineage response format across DataHub MCP versions.
 * The MCP server might return:
 * - { upstream: [...], downstream: [...] }
 * - { upstreamEdges: [...], downstreamEdges: [...] }
 * - { entities: [...] } with direction metadata
 * - Empty results or missing fields
 */
export class LineageMapper {
  /**
   * Map raw MCP lineage response to internal Lineage model.
   *
   * Handles multiple response formats:
   * - Direct upstream/downstream arrays
   * - Nested in edges/relationships
   * - Empty/missing lineage
   */
  static mapLineage(rawResponse: any): Lineage {
    if (!rawResponse || typeof rawResponse !== 'object') {
      logger.warn(
        {
          event: 'lineage_mapper_invalid_input',
          responseType: typeof rawResponse,
        },
        'Invalid lineage response - returning empty lineage',
      );
      return { upstream: [], downstream: [] };
    }

    // Extract upstream
    const upstream = this.extractUpstream(rawResponse);

    // Extract downstream
    const downstream = this.extractDownstream(rawResponse);

    logger.debug(
      {
        event: 'lineage_mapped',
        upstreamCount: upstream.length,
        downstreamCount: downstream.length,
      },
      `Mapped lineage: ${upstream.length} upstream, ${downstream.length} downstream`,
    );

    return { upstream, downstream };
  }

  /**
   * Extract upstream lineage nodes from various response formats.
   */
  private static extractUpstream(response: any): LineageNode[] {
    // Try direct upstream array
    if (Array.isArray(response.upstream)) {
      return this.mapNodes(response.upstream, 'upstream');
    }

    // Try upstreamEdges
    if (Array.isArray(response.upstreamEdges)) {
      return this.mapEdgesToNodes(response.upstreamEdges, 'upstream');
    }

    // Try relationships with direction filter
    if (Array.isArray(response.relationships)) {
      const upstreamRels = response.relationships.filter(
        (rel: any) => rel.direction === 'upstream' || rel.type === 'upstream',
      );
      return this.mapNodes(upstreamRels, 'upstream');
    }

    // No upstream found
    return [];
  }

  /**
   * Extract downstream lineage nodes from various response formats.
   */
  private static extractDownstream(response: any): LineageNode[] {
    // Try direct downstream array
    if (Array.isArray(response.downstream)) {
      return this.mapNodes(response.downstream, 'downstream');
    }

    // Try downstreamEdges
    if (Array.isArray(response.downstreamEdges)) {
      return this.mapEdgesToNodes(response.downstreamEdges, 'downstream');
    }

    // Try relationships with direction filter
    if (Array.isArray(response.relationships)) {
      const downstreamRels = response.relationships.filter(
        (rel: any) =>
          rel.direction === 'downstream' || rel.type === 'downstream',
      );
      return this.mapNodes(downstreamRels, 'downstream');
    }

    // No downstream found
    return [];
  }

  /**
   * Map an array of raw nodes to LineageNode array.
   */
  private static mapNodes(
    rawNodes: any[],
    direction: 'upstream' | 'downstream',
  ): LineageNode[] {
    if (!Array.isArray(rawNodes) || rawNodes.length === 0) {
      return [];
    }

    const mapped: LineageNode[] = [];

    for (let i = 0; i < rawNodes.length; i++) {
      try {
        const node = this.mapNode(rawNodes[i]);
        if (node) {
          mapped.push(node);
        }
      } catch (error) {
        logger.warn(
          {
            event: 'lineage_node_mapping_failed',
            direction,
            index: i,
            error: error instanceof Error ? error.message : String(error),
          },
          `Failed to map ${direction} node at index ${i}`,
        );
      }
    }

    return mapped;
  }

  /**
   * Map edge objects to LineageNode array.
   * Edges typically have: { entity: {...}, type: "..." }
   */
  private static mapEdgesToNodes(
    edges: any[],
    direction: 'upstream' | 'downstream',
  ): LineageNode[] {
    if (!Array.isArray(edges) || edges.length === 0) {
      return [];
    }

    const nodes = edges.map((edge) => {
      // Extract entity from edge
      if (edge.entity) return edge.entity;
      if (edge.dataset) return edge.dataset;
      if (edge.node) return edge.node;
      return edge; // Edge might be the entity itself
    });

    return this.mapNodes(nodes, direction);
  }

  /**
   * Map a single raw node to LineageNode.
   */
  private static mapNode(rawNode: any): LineageNode | null {
    if (!rawNode || typeof rawNode !== 'object') {
      return null;
    }

    // Extract URN
    const urn = rawNode.urn || rawNode.id || rawNode.entityUrn;
    if (!urn) {
      logger.warn(
        {
          event: 'lineage_node_missing_urn',
          nodeKeys: Object.keys(rawNode),
        },
        'Lineage node missing URN - skipping',
      );
      return null;
    }

    // Extract name
    let name = rawNode.name || rawNode.title || rawNode.displayName;
    if (!name) {
      // Try to extract from URN as fallback
      const urnParts = urn.split(',');
      if (urnParts.length > 0) {
        name = urnParts[urnParts.length - 1].split(')')[0].trim();
      }
      if (!name) {
        name = 'Unknown Entity';
      }
    }

    // Extract entity type
    let entityType = rawNode.entityType || rawNode.type || rawNode.kind;

    // Normalize entity type to match our enum
    if (entityType) {
      entityType = this.normalizeEntityType(entityType);
    }

    // Default to dataset if not specified
    if (!entityType) {
      entityType = 'dataset';
    }

    return {
      urn,
      name,
      entityType,
    };
  }

  /**
   * Normalize entity type to match our EntityTypeSchema enum.
   */
  private static normalizeEntityType(type: string): string {
    const normalized = type.toLowerCase();

    // Map common variations
    const typeMap: Record<string, string> = {
      dataset: 'dataset',
      datasets: 'dataset',
      table: 'dataset',
      view: 'dataset',
      dashboard: 'dashboard',
      dashboards: 'dashboard',
      chart: 'chart',
      charts: 'chart',
      datajob: 'dataJob',
      job: 'dataJob',
      pipeline: 'dataJob',
      mlmodel: 'mlModel',
      model: 'mlModel',
      container: 'container',
      domain: 'domain',
      tag: 'tag',
      glossaryterm: 'glossaryTerm',
      term: 'glossaryTerm',
      assertion: 'assertion',
    };

    return typeMap[normalized] || type;
  }

  /**
   * Validate mapped lineage against LineageSchema.
   */
  static validate(lineage: Lineage): { valid: boolean; error?: string } {
    try {
      LineageSchema.parse(lineage);
      return { valid: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return { valid: false, error: errorMessage };
    }
  }

  /**
   * Map and validate in one step.
   */
  static mapAndValidate(rawResponse: any): Lineage {
    const mapped = this.mapLineage(rawResponse);

    const validation = this.validate(mapped);
    if (!validation.valid) {
      throw new Error(
        `Lineage validation failed: ${validation.error}. Mapped: ${JSON.stringify(mapped)}`,
      );
    }

    return mapped;
  }

  /**
   * Log mapping diagnostics.
   */
  static logMappingDiagnostics(
    toolName: string,
    requestPayload: any,
    rawResponse: any,
    mappedLineage: Lineage,
    durationMs: number,
  ): void {
    logger.debug(
      {
        event: 'lineage_mapping_complete',
        toolName,
        requestPayload,
        rawResponseKeys: rawResponse ? Object.keys(rawResponse) : [],
        upstreamCount: mappedLineage.upstream.length,
        downstreamCount: mappedLineage.downstream.length,
        durationMs: Math.round(durationMs),
        sampleUpstream: mappedLineage.upstream[0],
        sampleDownstream: mappedLineage.downstream[0],
      },
      `Mapped lineage: ${mappedLineage.upstream.length} upstream, ${mappedLineage.downstream.length} downstream`,
    );
  }
}
