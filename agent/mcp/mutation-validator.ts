import { logger } from '../config/logger.js';
import {
  MutationToolRegistry,
  MutationToolSchema,
} from './mutation-registry.js';

/**
 * Result of building and validating a mutation payload.
 */
export interface MutationPayloadResult {
  valid: boolean;
  payload?: Record<string, any>;
  errors: string[];
  warnings: string[];
}

/**
 * MutationValidator - Builds and validates mutation payloads against discovered MCP schemas.
 *
 * This class:
 * 1. Takes mutation parameters in a flexible format
 * 2. Builds a payload using the actual MCP tool schema
 * 3. Validates the payload before execution
 * 4. Provides clear errors if required fields are missing
 * 5. Never sends invalid payloads to the MCP server
 */
export class MutationValidator {
  constructor(private readonly registry: MutationToolRegistry) {}

  /**
   * Build a payload for adding tags.
   *
   * Input can be:
   * - urn: string | string[]
   * - tags: string | string[]
   *
   * Output matches MCP schema:
   * - entity_urns: string[]
   * - tag_urns: string[]
   */
  buildAddTagsPayload(
    entityUrns: string | string[],
    tagUrns: string | string[],
  ): MutationPayloadResult {
    const schema = this.registry.requireTool('add_tags');

    const payload = this.buildPayload(
      'add_tags',
      {
        entity_urns: this.ensureArray(entityUrns),
        tag_urns: this.ensureArray(tagUrns),
      },
      schema,
    );

    return payload;
  }

  /**
   * Build a payload for removing tags.
   */
  buildRemoveTagsPayload(
    entityUrns: string | string[],
    tagUrns: string | string[],
  ): MutationPayloadResult {
    const schema = this.registry.requireTool('remove_tags');

    const payload = this.buildPayload(
      'remove_tags',
      {
        entity_urns: this.ensureArray(entityUrns),
        tag_urns: this.ensureArray(tagUrns),
      },
      schema,
    );

    return payload;
  }

  /**
   * Build a payload for updating description.
   */
  buildUpdateDescriptionPayload(
    entityUrn: string,
    description: string,
    fieldPath?: string,
  ): MutationPayloadResult {
    const schema = this.registry.requireTool('update_description');

    const basePayload: Record<string, any> = {
      entity_urn: entityUrn,
      description,
    };

    if (fieldPath) {
      basePayload.field_path = fieldPath;
    }

    const payload = this.buildPayload(
      'update_description',
      basePayload,
      schema,
    );

    return payload;
  }

  /**
   * Build a payload for adding terms.
   */
  buildAddTermsPayload(
    entityUrns: string | string[],
    termUrns: string | string[],
  ): MutationPayloadResult {
    const schema = this.registry.requireTool('add_terms');

    const payload = this.buildPayload(
      'add_terms',
      {
        entity_urns: this.ensureArray(entityUrns),
        term_urns: this.ensureArray(termUrns),
      },
      schema,
    );

    return payload;
  }

  /**
   * Build a payload for removing terms.
   */
  buildRemoveTermsPayload(
    entityUrns: string | string[],
    termUrns: string | string[],
  ): MutationPayloadResult {
    const schema = this.registry.requireTool('remove_terms');

    const payload = this.buildPayload(
      'remove_terms',
      {
        entity_urns: this.ensureArray(entityUrns),
        term_urns: this.ensureArray(termUrns),
      },
      schema,
    );

    return payload;
  }

  /**
   * Build a payload for adding owners.
   */
  buildAddOwnersPayload(
    entityUrns: string | string[],
    owners: Array<{ owner_urn: string; ownership_type?: string }>,
  ): MutationPayloadResult {
    const schema = this.registry.requireTool('add_owners');

    const payload = this.buildPayload(
      'add_owners',
      {
        entity_urns: this.ensureArray(entityUrns),
        owners,
      },
      schema,
    );

    return payload;
  }

  /**
   * Build a payload for removing owners.
   */
  buildRemoveOwnersPayload(
    entityUrns: string | string[],
    ownerUrns: string | string[],
  ): MutationPayloadResult {
    const schema = this.registry.requireTool('remove_owners');

    const payload = this.buildPayload(
      'remove_owners',
      {
        entity_urns: this.ensureArray(entityUrns),
        owner_urns: this.ensureArray(ownerUrns),
      },
      schema,
    );

    return payload;
  }

  /**
   * Build a payload for setting domain.
   */
  buildSetDomainPayload(
    entityUrns: string | string[],
    domainUrn: string,
  ): MutationPayloadResult {
    const schema = this.registry.requireTool('set_domains');

    const payload = this.buildPayload(
      'set_domains',
      {
        entity_urns: this.ensureArray(entityUrns),
        domain_urn: domainUrn,
      },
      schema,
    );

    return payload;
  }

  /**
   * Build a payload for removing domain.
   */
  buildRemoveDomainPayload(
    entityUrns: string | string[],
  ): MutationPayloadResult {
    const schema = this.registry.requireTool('remove_domains');

    const payload = this.buildPayload(
      'remove_domains',
      {
        entity_urns: this.ensureArray(entityUrns),
      },
      schema,
    );

    return payload;
  }

  /**
   * Build a payload for adding structured properties.
   */
  buildAddStructuredPropertiesPayload(
    entityUrns: string | string[],
    propertyValues: Record<string, unknown[]>,
  ): MutationPayloadResult {
    const schema = this.registry.requireTool('add_structured_properties');

    const payload = this.buildPayload(
      'add_structured_properties',
      {
        entity_urns: this.ensureArray(entityUrns),
        property_values: propertyValues,
      },
      schema,
    );

    return payload;
  }

  /**
   * Build a payload for removing structured properties.
   */
  buildRemoveStructuredPropertiesPayload(
    entityUrns: string | string[],
    propertyUrns: string | string[],
  ): MutationPayloadResult {
    const schema = this.registry.requireTool('remove_structured_properties');

    const payload = this.buildPayload(
      'remove_structured_properties',
      {
        entity_urns: this.ensureArray(entityUrns),
        property_urns: this.ensureArray(propertyUrns),
      },
      schema,
    );

    return payload;
  }

  /**
   * Build a payload for saving a document.
   */
  buildSaveDocumentPayload(
    entityUrn: string,
    documentTitle: string,
    documentUrl: string,
  ): MutationPayloadResult {
    const schema = this.registry.requireTool('save_document');

    const payload = this.buildPayload(
      'save_document',
      {
        entity_urn: entityUrn,
        document_title: documentTitle,
        document_url: documentUrl,
      },
      schema,
    );

    return payload;
  }

  /**
   * Build a payload for setting lifecycle stage.
   */
  buildSetLifecycleStagePayload(
    entityUrns: string | string[],
    stage: string,
  ): MutationPayloadResult {
    const schema = this.registry.requireTool('set_lifecycle_stage');

    const payload = this.buildPayload(
      'set_lifecycle_stage',
      {
        entity_urns: this.ensureArray(entityUrns),
        lifecycle_stage: stage,
      },
      schema,
    );

    return payload;
  }

  /**
   * Generic payload builder and validator.
   *
   * @param toolName - Name of the mutation tool
   * @param candidatePayload - The payload to build and validate
   * @param schema - The MCP tool schema to validate against
   * @returns Validated payload or errors
   */
  private buildPayload(
    toolName: string,
    candidatePayload: Record<string, any>,
    schema: MutationToolSchema,
  ): MutationPayloadResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const payload: Record<string, any> = {};

    // Build payload with only recognized parameters
    const allowedParams = new Set(schema.parameters.map((p) => p.name));

    for (const [key, value] of Object.entries(candidatePayload)) {
      if (allowedParams.has(key)) {
        if (value !== null && value !== undefined) {
          payload[key] = value;
        }
      } else {
        warnings.push(
          `Parameter "${key}" is not recognized by "${toolName}". Skipping.`,
        );
      }
    }

    // Check for required parameters
    for (const required of schema.requiredParameters) {
      if (!(required in payload)) {
        errors.push(
          `Required parameter missing for "${toolName}": "${required}"`,
        );
      }
    }

    // Validate types
    for (const param of schema.parameters) {
      if (param.name in payload) {
        const value = payload[param.name];

        if (param.type === 'array' && !Array.isArray(value)) {
          errors.push(
            `Parameter "${param.name}" for "${toolName}" must be an array`,
          );
        }

        if (param.type === 'string' && typeof value !== 'string') {
          errors.push(
            `Parameter "${param.name}" for "${toolName}" must be a string`,
          );
        }

        if (param.type === 'object' && typeof value !== 'object') {
          errors.push(
            `Parameter "${param.name}" for "${toolName}" must be an object`,
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      ...(errors.length === 0 && { payload }),
      errors,
      warnings,
    };
  }

  /**
   * Ensure a value is an array.
   * - If already an array, return as-is
   * - If string, return [string]
   * - If null/undefined, return []
   */
  private ensureArray(value: any): any[] {
    if (Array.isArray(value)) {
      return value;
    }
    if (value === null || value === undefined) {
      return [];
    }
    return [value];
  }

  /**
   * Validate a payload against the registry.
   */
  validatePayload(
    toolName: string,
    payload: Record<string, any>,
  ): { valid: boolean; errors: string[] } {
    return this.registry.validatePayload(toolName, payload);
  }
}
