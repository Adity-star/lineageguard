import { z } from "zod";
import { MCPClient } from "../client.js";
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
/* Thin wrappers around every mutation tool exposed by                 */
/* mcp-server-datahub (requires TOOLS_IS_MUTATION_ENABLED=true).       */
/* ------------------------------------------------------------------ */

export class MutationTool {
  constructor(private readonly client: MCPClient) {}

  // ----------------------------------------------------------------
  // Tags
  // ----------------------------------------------------------------

  /**
   * Add one or more tags to a dataset or schema field.
   * @param urn      Dataset URN
   * @param tags     Array of tag URNs, e.g. ["urn:li:tag:PII"]
   * @param fieldPath  Optional – when set, tags are applied to the column
   */
  async addTags(
    urn: string,
    tags: string[],
    fieldPath?: string
  ): Promise<MutationResult> {
    logger.info({
      event: "datahub_add_tags",
      urn,
      tags,
      fieldPath,
    }, `Adding tags ${tags.join(", ")} to ${fieldPath ? `${urn}#${fieldPath}` : urn}`);

    const args: Record<string, unknown> = { urn, tags };
    if (fieldPath) args.fieldPath = fieldPath;

    const result = await this.client.executeTool(
      "add_tags",
      args,
      MutationResultSchema
    );
    return result.data;
  }

  /**
   * Remove one or more tags from a dataset or schema field.
   */
  async removeTags(
    urn: string,
    tags: string[],
    fieldPath?: string
  ): Promise<MutationResult> {
    logger.info({
      event: "datahub_remove_tags",
      urn,
      tags,
      fieldPath,
    }, `Removing tags ${tags.join(", ")} from ${urn}`);

    const args: Record<string, unknown> = { urn, tags };
    if (fieldPath) args.fieldPath = fieldPath;

    const result = await this.client.executeTool(
      "remove_tags",
      args,
      MutationResultSchema
    );
    return result.data;
  }

  // ----------------------------------------------------------------
  // Glossary Terms
  // ----------------------------------------------------------------

  /**
   * Add glossary terms to a dataset or schema field.
   * @param terms  Array of glossary term URNs
   */
  async addTerms(
    urn: string,
    terms: string[],
    fieldPath?: string
  ): Promise<MutationResult> {
    logger.info({
      event: "datahub_add_terms",
      urn,
      terms,
      fieldPath,
    }, `Adding glossary terms to ${urn}`);

    const args: Record<string, unknown> = { urn, terms };
    if (fieldPath) args.fieldPath = fieldPath;

    const result = await this.client.executeTool(
      "add_terms",
      args,
      MutationResultSchema
    );
    return result.data;
  }

  /**
   * Remove glossary terms from a dataset or schema field.
   */
  async removeTerms(
    urn: string,
    terms: string[],
    fieldPath?: string
  ): Promise<MutationResult> {
    logger.info({
      event: "datahub_remove_terms",
      urn,
      terms,
      fieldPath,
    }, `Removing glossary terms from ${urn}`);

    const args: Record<string, unknown> = { urn, terms };
    if (fieldPath) args.fieldPath = fieldPath;

    const result = await this.client.executeTool(
      "remove_terms",
      args,
      MutationResultSchema
    );
    return result.data;
  }

  // ----------------------------------------------------------------
  // Owners
  // ----------------------------------------------------------------

  /**
   * Add owners to a dataset.
   * @param owners  Array of { ownerUrn, ownershipType } objects
   *                ownershipType: "TECHNICAL_OWNER" | "BUSINESS_OWNER" | "DATA_STEWARD" | "NONE"
   */
  async addOwners(
    urn: string,
    owners: Array<{ ownerUrn: string; ownershipType?: string }>
  ): Promise<MutationResult> {
    logger.info({
      event: "datahub_add_owners",
      urn,
      owners,
    }, `Adding ${owners.length} owner(s) to ${urn}`);

    const result = await this.client.executeTool(
      "add_owners",
      { urn, owners },
      MutationResultSchema
    );
    return result.data;
  }

  /**
   * Remove owners from a dataset.
   */
  async removeOwners(
    urn: string,
    ownerUrns: string[]
  ): Promise<MutationResult> {
    logger.info({
      event: "datahub_remove_owners",
      urn,
      ownerUrns,
    }, `Removing ${ownerUrns.length} owner(s) from ${urn}`);

    const result = await this.client.executeTool(
      "remove_owners",
      { urn, ownerUrns },
      MutationResultSchema
    );
    return result.data;
  }

  // ----------------------------------------------------------------
  // Domains
  // ----------------------------------------------------------------

  /**
   * Assign a domain to a dataset.
   * @param domainUrn  e.g. "urn:li:domain:engineering"
   */
  async setDomain(
    urn: string,
    domainUrn: string
  ): Promise<MutationResult> {
    logger.info({
      event: "datahub_set_domain",
      urn,
      domainUrn,
    }, `Assigning domain ${domainUrn} to ${urn}`);

    const result = await this.client.executeTool(
      "set_domains",
      { urn, domainUrn },
      MutationResultSchema
    );
    return result.data;
  }

  /**
   * Remove domain membership from a dataset.
   */
  async removeDomain(
    urn: string,
    domainUrn: string
  ): Promise<MutationResult> {
    logger.info({
      event: "datahub_remove_domain",
      urn,
      domainUrn,
    }, `Removing domain ${domainUrn} from ${urn}`);

    const result = await this.client.executeTool(
      "remove_domains",
      { urn, domainUrn },
      MutationResultSchema
    );
    return result.data;
  }

  // ----------------------------------------------------------------
  // Description
  // ----------------------------------------------------------------

  /**
   * Update the description of a dataset or a specific schema field.
   * @param mode  "overwrite" (default) | "append" | "remove"
   */
  async updateDescription(
    urn: string,
    description: string,
    fieldPath?: string,
    mode: "overwrite" | "append" | "remove" = "overwrite"
  ): Promise<MutationResult> {
    logger.info({
      event: "datahub_update_description",
      urn,
      fieldPath,
      mode,
      descriptionLength: description.length,
    }, `Updating description on ${fieldPath ? `${urn}#${fieldPath}` : urn} [${mode}]`);

    const args: Record<string, unknown> = { urn, description, mode };
    if (fieldPath) args.fieldPath = fieldPath;

    const result = await this.client.executeTool(
      "update_description",
      args,
      MutationResultSchema
    );
    return result.data;
  }

  // ----------------------------------------------------------------
  // Structured Properties
  // ----------------------------------------------------------------

  /**
   * Upsert structured properties on a dataset.
   * @param properties  Map of property URN → value(s)
   *                    Values can be string | number | string[] | number[]
   */
  async addStructuredProperties(
    urn: string,
    properties: Record<string, string | number | string[] | number[]>
  ): Promise<MutationResult> {
    logger.info({
      event: "datahub_add_structured_properties",
      urn,
      propertyKeys: Object.keys(properties),
    }, `Writing ${Object.keys(properties).length} structured property/ies to ${urn}`);

    const result = await this.client.executeTool(
      "add_structured_properties",
      { urn, properties },
      MutationResultSchema
    );
    return result.data;
  }

  /**
   * Remove structured properties from a dataset.
   */
  async removeStructuredProperties(
    urn: string,
    propertyUrns: string[]
  ): Promise<MutationResult> {
    logger.info({
      event: "datahub_remove_structured_properties",
      urn,
      propertyUrns,
    }, `Removing ${propertyUrns.length} structured property/ies from ${urn}`);

    const result = await this.client.executeTool(
      "remove_structured_properties",
      { urn, propertyUrns },
      MutationResultSchema
    );
    return result.data;
  }
}
