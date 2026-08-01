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
