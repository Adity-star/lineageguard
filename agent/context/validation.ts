import { z } from "zod";
import { ContextBundle } from "./type.js";
import { logger } from "../config/logger.js";

export class ContextValidationError extends Error {
  constructor(
    public readonly field: string,
    message: string
  ) {
    super(message);
    this.name = "ContextValidationError";
  }
}

export function validateContextBundle(bundle: ContextBundle): void {
  const errors: string[] = [];

  // Validate dataset
  if (!bundle.dataset) {
    errors.push("Dataset is missing");
  } else if (!bundle.dataset.urn) {
    errors.push("Dataset URN is missing");
  } else if (!bundle.dataset.name) {
    errors.push("Dataset name is missing");
  }

  // Validate schema
  if (!bundle.schema || bundle.schema.length === 0) {
    errors.push("Schema is empty or missing");
  }

  // Validate lineage
  if (!bundle.lineage) {
    errors.push("Lineage is missing");
  } else {
    if (!bundle.lineage.upstream) {
      errors.push("Lineage upstream is missing");
    }
    if (!bundle.lineage.downstream) {
      errors.push("Lineage downstream is missing");
    }
  }

  // Validate queries
  if (!bundle.queries) {
    errors.push("Queries array is missing");
  }

  // Validate documents
  if (!bundle.documents) {
    errors.push("Documents array is missing");
  }

  // Validate owners
  if (!bundle.owners || bundle.owners.length === 0) {
    errors.push("Owners array is empty or missing");
  }

  // Validate provenance
  if (!bundle.provenance) {
    errors.push("Provenance is missing");
  } else {
    if (!bundle.provenance.datasetUrn) {
      errors.push("Provenance datasetUrn is missing");
    }
    if (!bundle.provenance.retrievedAt) {
      errors.push("Provenance retrievedAt is missing");
    }
    if (!bundle.provenance.source) {
      errors.push("Provenance source is missing");
    }
  }

  // Validate statistics
  if (!bundle.statistics) {
    errors.push("Statistics is missing");
  } else {
    if (bundle.statistics.totalFields !== bundle.schema.length) {
      errors.push(`Statistics totalFields (${bundle.statistics.totalFields}) does not match schema length (${bundle.schema.length})`);
    }
    if (bundle.statistics.upstreamCount !== bundle.lineage.upstream.length) {
      errors.push(`Statistics upstreamCount (${bundle.statistics.upstreamCount}) does not match lineage upstream length (${bundle.lineage.upstream.length})`);
    }
    if (bundle.statistics.downstreamCount !== bundle.lineage.downstream.length) {
      errors.push(`Statistics downstreamCount (${bundle.statistics.downstreamCount}) does not match lineage downstream length (${bundle.lineage.downstream.length})`);
    }
  }

  // Validate deprecation status
  if (bundle.deprecation && bundle.deprecation.deprecated) {
    logger.warn({
      datasetUrn: bundle.dataset.urn,
      note: bundle.deprecation.note,
      decommissionDate: bundle.deprecation.decommissionDate,
    }, 'Dataset is deprecated');
  }

  // If there are errors, throw
  if (errors.length > 0) {
    logger.error({
      datasetUrn: bundle.dataset?.urn,
      errors,
    }, 'ContextBundle validation failed');

    throw new ContextValidationError(
      "context_bundle",
      `ContextBundle validation failed: ${errors.join(", ")}`
    );
  }

  logger.info({
    datasetUrn: bundle.dataset.urn,
    statistics: bundle.statistics,
  }, 'ContextBundle validation passed');
}

export function validateContextBundleSchema(): z.ZodSchema<ContextBundle> {
  return z.object({
    dataset: z.object({
      urn: z.string(),
      name: z.string(),
      platform: z.string(),
      description: z.string().optional(),
      owners: z.array(z.object({
        urn: z.string(),
        name: z.string(),
        type: z.string(),
      })),
      tags: z.array(z.string()),
      glossaryTerms: z.array(z.object({
        urn: z.string(),
        name: z.string(),
        description: z.string().optional(),
      })),
        urn: z.string(),
        name: z.string(),
        description: z.string().optional(),
      })),
    }),
    schema: z.array(z.object({
      fieldPath: z.string(),
      type: z.string(),
      nullable: z.boolean(),
      tags: z.array(z.string()),
      description: z.string().optional(),
    })),
    lineage: z.object({
      upstream: z.array(z.object({
        urn: z.string(),
        name: z.string(),
        entityType: z.string(),
      })),
      downstream: z.array(z.object({
        urn: z.string(),
        name: z.string(),
        entityType: z.string(),
      })),
    }),
    queries: z.array(z.object({
      id: z.string(),
      sql: z.string(),
      lastSeen: z.string().optional(),
    })),
    documents: z.array(z.object({
      id: z.string(),
      title: z.string(),
      snippet: z.string(),
      url: z.string().optional(),
    })),
    owners: z.array(z.object({
      urn: z.string(),
      name: z.string(),
      type: z.string(),
    })),
    glossaryTerms: z.array(z.object({
      urn: z.string(),
      name: z.string(),
      description: z.string().optional(),
    })),
    tags: z.array(z.string()),
    structuredProperties: z.record(z.string(), z.any()),
    usage: z.object({
      queryCount: z.number(),
      lastQueried: z.string().optional(),
      topUsers: z.array(z.object({
        user: z.string(),
        count: z.number(),
      })).optional(),
    }),
    quality: z.object({
      passedChecks: z.number(),
      failedChecks: z.number(),
      lastChecked: z.string().optional(),
    }),
    domain: z.object({
      urn: z.string(),
      name: z.string(),
      description: z.string().optional(),
    }).optional(),
    certification: z.object({
      certified: z.boolean(),
      level: z.string().optional(),
      lastCertified: z.string().optional(),
      certifier: z.string().optional(),
    }),
    deprecation: z.object({
      deprecated: z.boolean(),
      note: z.string().optional(),
      decommissionDate: z.string().optional(),
    }),
    relatedDashboards: z.array(z.object({
      urn: z.string(),
      name: z.string(),
      url: z.string().optional(),
    })),
    relatedPipelines: z.array(z.object({
      urn: z.string(),
      name: z.string(),
      platform: z.string(),
    })),
    relatedDbtModels: z.array(z.object({
      urn: z.string(),
      name: z.string(),
      package: z.string(),
    })),
    statistics: z.object({
      totalFields: z.number(),
      upstreamCount: z.number(),
      downstreamCount: z.number(),
      queryCount: z.number(),
      documentCount: z.number(),
      ownerCount: z.number(),
      glossaryTermCount: z.number(),
      tagCount: z.number(),
      dashboardCount: z.number(),
      pipelineCount: z.number(),
      dbtModelCount: z.number(),
    }),
    provenance: z.object({
      datasetUrn: z.string(),
      retrievedAt: z.string(),
      source: z.enum(['datahub', 'fallback']),
      catalogVersion: z.string().optional(),
      retrievalDurationMs: z.number(),
    }),
  }) as z.ZodSchema<ContextBundle>;
}
