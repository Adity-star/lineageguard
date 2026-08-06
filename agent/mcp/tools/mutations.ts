import { z } from "zod";
import { MCPClient } from "../client.js";
import { MutationValidator } from "../mutation-validator.js";
import { MutationToolRegistry } from "../mutation-registry.js";
import { MutationLogger } from "../mutation-logger.js";
import { logger } from "../../config/logger.js";

/* ------------------------------------------------------------------ */
/* Input / output schemas                                               */
/* ------------------------------------------------------------------ */

const MutationResultSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export type MutationResult = z.infer<typeof MutationResultSchema>;

/* ------------------------------------------------------------------ */
/* MutationTool                                                         */
/* 

export class MutationTool {
  private readonly validator: MutationValidator;

  constructor(
    private readonly client: MCPClient,
    private readonly registry: MutationToolRegistry
  ) {
    this.validator = new MutationValidator(registry);
  }

  // ----------------------------------------------------------------
  // Tags
  // ----------------------------------------------------------------

  /**
   * Add one or more tags to a dataset or schema field.
   * 
   * @param entityUrns Dataset URN(s) - will be converted to array
   * @param tagUrns Tag URN(s) - will be converted to array
   * @param fieldPath Optional – when set, tags are applied to the column
   */
  async addTags(
    entityUrns: string | string[],
    tagUrns: string | string[],
    fieldPath?: string
  ): Promise<MutationResult> {
    const toolName = "add_tags";
    const startTime = performance.now();

    try {
      // Build payload using discovered schema
      let result = this.validator.buildAddTagsPayload(entityUrns, tagUrns);

      if (!result.valid) {
        MutationLogger.logValidationFailure(toolName, result.errors, result.warnings);
        throw new Error(`Invalid payload for ${toolName}: ${result.errors.join("; ")}`);
      }

      // Add fieldPath if provided
      if (fieldPath && result.payload) {
        result.payload.field_path = fieldPath;
      }

      const payload = result.payload!;

      // Log mutation start with detailed context
      const entityCount = Array.isArray(payload.entity_urns) ? payload.entity_urns.length : 0;
      const tagCount = Array.isArray(payload.tag_urns) ? payload.tag_urns.length : 0;
      MutationLogger.logMutationStart(toolName, payload, {
        entityCount,
        totalItems: tagCount,
      });

      const response = await this.client.executeTool(
        toolName,
        payload,
        MutationResultSchema
      );

      // Log success with response details
      const durationMs = performance.now() - startTime;
      MutationLogger.logMutationSuccess(toolName, payload, response.data, durationMs, {
        entityCount,
        totalItems: tagCount,
      });

      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const durationMs = performance.now() - startTime;
      MutationLogger.logMutationFailure(toolName, {}, errorMessage, durationMs);
      throw error;
    }
  }

  /**
   * Remove one or more tags from a dataset or schema field.
   */
  async removeTags(
    entityUrns: string | string[],
    tagUrns: string | string[],
    fieldPath?: string
  ): Promise<MutationResult> {
    const toolName = "remove_tags";
    const startTime = performance.now();

    try {
      // Build payload using discovered schema
      let result = this.validator.buildRemoveTagsPayload(entityUrns, tagUrns);

      if (!result.valid) {
        MutationLogger.logValidationFailure(toolName, result.errors, result.warnings);
        throw new Error(`Invalid payload for ${toolName}: ${result.errors.join("; ")}`);
      }

      if (fieldPath && result.payload) {
        result.payload.field_path = fieldPath;
      }

      const payload = result.payload!;

      const entityCount = Array.isArray(payload.entity_urns) ? payload.entity_urns.length : 0;
      const tagCount = Array.isArray(payload.tag_urns) ? payload.tag_urns.length : 0;
      MutationLogger.logMutationStart(toolName, payload, { entityCount, totalItems: tagCount });

      const response = await this.client.executeTool(
        toolName,
        payload,
        MutationResultSchema
      );

      const durationMs = performance.now() - startTime;
      MutationLogger.logMutationSuccess(toolName, payload, response.data, durationMs, {
        entityCount,
        totalItems: tagCount,
      });

      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const durationMs = performance.now() - startTime;
      MutationLogger.logMutationFailure(toolName, {}, errorMessage, durationMs);
      throw error;
    }
  }

  // ----------------------------------------------------------------
  // Glossary Terms
  // ----------------------------------------------------------------

  /**
   * Add glossary terms to a dataset or schema field.
   * @param termUrns Array of glossary term URNs
   */
  async addTerms(
    entityUrns: string | string[],
    termUrns: string | string[],
    fieldPath?: string
  ): Promise<MutationResult> {
    const toolName = "add_terms";
    const startTime = performance.now();

    try {
      let result = this.validator.buildAddTermsPayload(entityUrns, termUrns);

      if (!result.valid) {
        MutationLogger.logValidationFailure(toolName, result.errors, result.warnings);
        throw new Error(`Invalid payload for ${toolName}: ${result.errors.join("; ")}`);
      }

      if (fieldPath && result.payload) {
        result.payload.field_path = fieldPath;
      }

      const payload = result.payload!;

      const entityCount = Array.isArray(payload.entity_urns) ? payload.entity_urns.length : 0;
      const termCount = Array.isArray(payload.term_urns) ? payload.term_urns.length : 0;
      MutationLogger.logMutationStart(toolName, payload, { entityCount, totalItems: termCount });

      const response = await this.client.executeTool(
        toolName,
        payload,
        MutationResultSchema
      );

      const durationMs = performance.now() - startTime;
      MutationLogger.logMutationSuccess(toolName, payload, response.data, durationMs, {
        entityCount,
        totalItems: termCount,
      });

      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const durationMs = performance.now() - startTime;
      MutationLogger.logMutationFailure(toolName, {}, errorMessage, durationMs);
      throw error;
    }
  }

  /**
   * Remove glossary terms from a dataset or schema field.
   */
  async removeTerms(
    entityUrns: string | string[],
    termUrns: string | string[],
    fieldPath?: string
  ): Promise<MutationResult> {
    const toolName = "remove_terms";
    const startTime = performance.now();

    try {
      let result = this.validator.buildRemoveTermsPayload(entityUrns, termUrns);

      if (!result.valid) {
        MutationLogger.logValidationFailure(toolName, result.errors, result.warnings);
        throw new Error(`Invalid payload for ${toolName}: ${result.errors.join("; ")}`);
      }

      if (fieldPath && result.payload) {
        result.payload.field_path = fieldPath;
      }

      const payload = result.payload!;

      const entityCount = Array.isArray(payload.entity_urns) ? payload.entity_urns.length : 0;
      const termCount = Array.isArray(payload.term_urns) ? payload.term_urns.length : 0;
      MutationLogger.logMutationStart(toolName, payload, { entityCount, totalItems: termCount });

      const response = await this.client.executeTool(
        toolName,
        payload,
        MutationResultSchema
      );

      const durationMs = performance.now() - startTime;
      MutationLogger.logMutationSuccess(toolName, payload, response.data, durationMs, {
        entityCount,
        totalItems: termCount,
      });

      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const durationMs = performance.now() - startTime;
      MutationLogger.logMutationFailure(toolName, {}, errorMessage, durationMs);
      throw error;
    }
  }

  // ----------------------------------------------------------------
  // Owners
  // ----------------------------------------------------------------

  /**
   * Add owners to a dataset.
   * @param owners Array of { owner_urn, ownership_type } objects
   */
  async addOwners(
    entityUrns: string | string[],
    owners: Array<{ owner_urn: string; ownership_type?: string }>
  ): Promise<MutationResult> {
    const toolName = "add_owners";
    const startTime = performance.now();

    try {
      const result = this.validator.buildAddOwnersPayload(entityUrns, owners);

      if (!result.valid) {
        MutationLogger.logValidationFailure(toolName, result.errors, result.warnings);
        throw new Error(`Invalid payload for ${toolName}: ${result.errors.join("; ")}`);
      }

      const payload = result.payload!;

      const entityCount = Array.isArray(payload.entity_urns) ? payload.entity_urns.length : 0;
      const ownerCount = Array.isArray(payload.owners) ? payload.owners.length : 0;
      MutationLogger.logMutationStart(toolName, payload, { entityCount, totalItems: ownerCount });

      const response = await this.client.executeTool(
        toolName,
        payload,
        MutationResultSchema
      );

      const durationMs = performance.now() - startTime;
      MutationLogger.logMutationSuccess(toolName, payload, response.data, durationMs, {
        entityCount,
        totalItems: ownerCount,
      });

      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const durationMs = performance.now() - startTime;
      MutationLogger.logMutationFailure(toolName, {}, errorMessage, durationMs);
      throw error;
    }
  }

  /**
   * Remove owners from a dataset.
   */
  async removeOwners(
    entityUrns: string | string[],
    ownerUrns: string | string[]
  ): Promise<MutationResult> {
    const toolName = "remove_owners";
    const startTime = performance.now();

    try {
      const result = this.validator.buildRemoveOwnersPayload(entityUrns, ownerUrns);

      if (!result.valid) {
        MutationLogger.logValidationFailure(toolName, result.errors, result.warnings);
        throw new Error(`Invalid payload for ${toolName}: ${result.errors.join("; ")}`);
      }

      const payload = result.payload!;

      const entityCount = Array.isArray(payload.entity_urns) ? payload.entity_urns.length : 0;
      const ownerCount = Array.isArray(payload.owner_urns) ? payload.owner_urns.length : 0;
      MutationLogger.logMutationStart(toolName, payload, { entityCount, totalItems: ownerCount });

      const response = await this.client.executeTool(
        toolName,
        payload,
        MutationResultSchema
      );

      const durationMs = performance.now() - startTime;
      MutationLogger.logMutationSuccess(toolName, payload, response.data, durationMs, {
        entityCount,
        totalItems: ownerCount,
      });

      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const durationMs = performance.now() - startTime;
      MutationLogger.logMutationFailure(toolName, {}, errorMessage, durationMs);
      throw error;
    }
  }

  // ----------------------------------------------------------------
  // Domains
  // ----------------------------------------------------------------

  /**
   * Assign a domain to a dataset.
   * @param domainUrn e.g. "urn:li:domain:engineering"
   */
  async setDomain(
    entityUrns: string | string[],
    domainUrn: string
  ): Promise<MutationResult> {
    const toolName = "set_domains";
    const startTime = performance.now();

    try {
      const result = this.validator.buildSetDomainPayload(entityUrns, domainUrn);

      if (!result.valid) {
        MutationLogger.logValidationFailure(toolName, result.errors, result.warnings);
        throw new Error(`Invalid payload for ${toolName}: ${result.errors.join("; ")}`);
      }

      const payload = result.payload!;

      const entityCount = Array.isArray(payload.entity_urns) ? payload.entity_urns.length : 0;
      MutationLogger.logMutationStart(toolName, payload, { entityCount });

      const response = await this.client.executeTool(
        toolName,
        payload,
        MutationResultSchema
      );

      const durationMs = performance.now() - startTime;
      MutationLogger.logMutationSuccess(toolName, payload, response.data, durationMs, {
        entityCount,
      });

      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const durationMs = performance.now() - startTime;
      MutationLogger.logMutationFailure(toolName, {}, errorMessage, durationMs);
      throw error;
    }
  }

  /**
   * Remove domain membership from a dataset.
   */
  async removeDomain(
    entityUrns: string | string[]
  ): Promise<MutationResult> {
    const toolName = "remove_domains";
    const startTime = performance.now();

    try {
      const result = this.validator.buildRemoveDomainPayload(entityUrns);

      if (!result.valid) {
        MutationLogger.logValidationFailure(toolName, result.errors, result.warnings);
        throw new Error(`Invalid payload for ${toolName}: ${result.errors.join("; ")}`);
      }

      const payload = result.payload!;

      const entityCount = Array.isArray(payload.entity_urns) ? payload.entity_urns.length : 0;
      MutationLogger.logMutationStart(toolName, payload, { entityCount });

      const response = await this.client.executeTool(
        toolName,
        payload,
        MutationResultSchema
      );

      const durationMs = performance.now() - startTime;
      MutationLogger.logMutationSuccess(toolName, payload, response.data, durationMs, {
        entityCount,
      });

      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const durationMs = performance.now() - startTime;
      MutationLogger.logMutationFailure(toolName, {}, errorMessage, durationMs);
      throw error;
    }
  }

  // ----------------------------------------------------------------
  // Description
  // ----------------------------------------------------------------

  /**
   * Update the description of a dataset or a specific schema field.
   */
  async updateDescription(
    entityUrn: string,
    description: string,
    fieldPath?: string
  ): Promise<MutationResult> {
    const toolName = "update_description";
    const startTime = performance.now();

    try {
      const result = this.validator.buildUpdateDescriptionPayload(
        entityUrn,
        description,
        fieldPath
      );

      if (!result.valid) {
        MutationLogger.logValidationFailure(toolName, result.errors, result.warnings);
        throw new Error(`Invalid payload for ${toolName}: ${result.errors.join("; ")}`);
      }

      const payload = result.payload!;

      MutationLogger.logMutationStart(toolName, payload, {
        descriptionLength: description.length,
      });

      const response = await this.client.executeTool(
        toolName,
        payload,
        MutationResultSchema
      );

      const durationMs = performance.now() - startTime;
      MutationLogger.logMutationSuccess(toolName, payload, response.data, durationMs, {
        descriptionLength: description.length,
      });

      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const durationMs = performance.now() - startTime;
      MutationLogger.logMutationFailure(toolName, {}, errorMessage, durationMs);
      throw error;
    }
  }

  // ----------------------------------------------------------------
  // Structured Properties
  // ----------------------------------------------------------------

  /**
   * Upsert structured properties on a dataset.
   */
  async addStructuredProperties(
    entityUrns: string | string[],
    propertyValues: Record<string, any>
  ): Promise<MutationResult> {
    const toolName = "add_structured_properties";
    const startTime = performance.now();

    try {
      const result = this.validator.buildAddStructuredPropertiesPayload(
        entityUrns,
        propertyValues
      );

      if (!result.valid) {
        MutationLogger.logValidationFailure(toolName, result.errors, result.warnings);
        throw new Error(`Invalid payload for ${toolName}: ${result.errors.join("; ")}`);
      }

      const payload = result.payload!;

      const entityCount = Array.isArray(payload.entity_urns) ? payload.entity_urns.length : 0;
      const propertyCount = Object.keys(propertyValues).length;
      MutationLogger.logMutationStart(toolName, payload, { entityCount, propertyCount });

      const response = await this.client.executeTool(
        toolName,
        payload,
        MutationResultSchema
      );

      const durationMs = performance.now() - startTime;
      MutationLogger.logMutationSuccess(toolName, payload, response.data, durationMs, {
        entityCount,
        propertyCount,
      });

      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const durationMs = performance.now() - startTime;
      MutationLogger.logMutationFailure(toolName, {}, errorMessage, durationMs);
      throw error;
    }
  }

  /**
   * Remove structured properties from a dataset.
   */
  async removeStructuredProperties(
    entityUrns: string | string[],
    propertyUrns: string | string[]
  ): Promise<MutationResult> {
    const toolName = "remove_structured_properties";
    const startTime = performance.now();

    try {
      const result = this.validator.buildRemoveStructuredPropertiesPayload(
        entityUrns,
        propertyUrns
      );

      if (!result.valid) {
        MutationLogger.logValidationFailure(toolName, result.errors, result.warnings);
        throw new Error(`Invalid payload for ${toolName}: ${result.errors.join("; ")}`);
      }

      const payload = result.payload!;

      const entityCount = Array.isArray(payload.entity_urns) ? payload.entity_urns.length : 0;
      const propertyCount = Array.isArray(payload.property_urns) ? payload.property_urns.length : 0;
      MutationLogger.logMutationStart(toolName, payload, { entityCount, propertyCount });

      const response = await this.client.executeTool(
        toolName,
        payload,
        MutationResultSchema
      );

      const durationMs = performance.now() - startTime;
      MutationLogger.logMutationSuccess(toolName, payload, response.data, durationMs, {
        entityCount,
        propertyCount,
      });

      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const durationMs = performance.now() - startTime;
      MutationLogger.logMutationFailure(toolName, {}, errorMessage, durationMs);
      throw error;
    }
  }
}
