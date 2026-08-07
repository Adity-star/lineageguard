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

  // Validate required fields only
  if (!bundle.dataset) {
    errors.push("Dataset missing");
  } else if (!bundle.dataset.urn) {
    errors.push("Dataset URN missing");
  } else if (!bundle.dataset.name) {
    errors.push("Dataset name missing");
  }

  if (!bundle.schema) {
    errors.push("Schema missing");
  }

  if (!bundle.lineage) {
    errors.push("Lineage missing");
  }

  // Optional fields: owners, tags, glossaryTerms, documents, relatedDashboards, relatedPipelines, relatedDbtModels, queries
  // These are allowed to be empty or missing

  // Validate provenance (required for tracking)
  if (!bundle.provenance) {
    errors.push("Provenance missing");
  } else {
    if (!bundle.provenance.datasetUrn) {
      errors.push("Provenance datasetUrn missing");
    }
    if (!bundle.provenance.retrievedAt) {
      errors.push("Provenance retrievedAt missing");
    }
    if (!bundle.provenance.source) {
      errors.push("Provenance source missing");
    }
  }

  // Validate statistics (conditional - only if schema and lineage are present)
  if (bundle.statistics && bundle.schema && bundle.lineage) {
    if (bundle.statistics.totalFields !== undefined && bundle.statistics.totalFields !== bundle.schema.length) {
      errors.push(`Statistics totalFields (${bundle.statistics.totalFields}) does not match schema length (${bundle.schema.length})`);
    }
    if (bundle.statistics.upstreamCount !== undefined && bundle.statistics.upstreamCount !== bundle.lineage.upstream.length) {
      errors.push(`Statistics upstreamCount (${bundle.statistics.upstreamCount}) does not match lineage upstream length (${bundle.lineage.upstream.length})`);
    }
    if (bundle.statistics.downstreamCount !== undefined && bundle.statistics.downstreamCount !== bundle.lineage.downstream.length) {
      errors.push(`Statistics downstreamCount (${bundle.statistics.downstreamCount}) does not match lineage downstream length (${bundle.lineage.downstream.length})`);
    }
  }

  // Validate deprecation status (warning only)
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
