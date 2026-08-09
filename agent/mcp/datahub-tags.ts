import { logger } from '../config/logger.js';

/**
 * Centralized LineageGuard tag definitions.
 * All LineageGuard-managed tags should be defined here.
 */
export const LINEAGEGUARD_TAGS = {
  REVIEWED: {
    urn: 'urn:li:tag:lineageguard_reviewed',
    name: 'lineageguard_reviewed',
    description: 'Dataset has been reviewed by LineageGuard',
  },
  RISK_LOW: {
    urn: 'urn:li:tag:lineageguard_risk_low',
    name: 'lineageguard_risk_low',
    description: 'LineageGuard risk assessment: LOW',
  },
  RISK_MEDIUM: {
    urn: 'urn:li:tag:lineageguard_risk_medium',
    name: 'lineageguard_risk_medium',
    description: 'LineageGuard risk assessment: MEDIUM',
  },
  RISK_HIGH: {
    urn: 'urn:li:tag:lineageguard_risk_high',
    name: 'lineageguard_risk_high',
    description: 'LineageGuard risk assessment: HIGH',
  },
  RISK_CRITICAL: {
    urn: 'urn:li:tag:lineageguard_risk_critical',
    name: 'lineageguard_risk_critical',
    description: 'LineageGuard risk assessment: CRITICAL',
  },
  REQUIRES_APPROVAL: {
    urn: 'urn:li:tag:lineageguard_requires_approval',
    name: 'lineageguard_requires_approval',
    description: 'Dataset changes require approval before deployment',
  },
} as const;

export type LineageGuardTagKey = keyof typeof LINEAGEGUARD_TAGS;

/**
 * DataHub GraphQL client for tag operations.
 * This provides direct access to DataHub's GraphQL API for tag provisioning
 * without relying on MCP tools that may not exist.
 */
export class DataHubTagClient {
  private readonly gmsUrl: string;
  private readonly token: string;

  constructor(gmsUrl: string, token: string) {
    this.gmsUrl = gmsUrl;
    this.token = token;
  }

  /**
   * Execute a GraphQL query against DataHub GMS.
   */
  private async executeGraphQL(
    query: string,
    variables: Record<string, any> = {},
  ): Promise<any> {
    // Check if credentials are available
    if (!this.gmsUrl || !this.token) {
      throw new Error(
        'DataHub GMS URL and token are required for GraphQL operations',
      );
    }

    try {
      const response = await fetch(`${this.gmsUrl}/api/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        throw new Error(
          `GraphQL request failed: ${response.status} ${response.statusText}`,
        );
      }

      const result = await response.json();

      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      return result.data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(
        {
          event: 'datahub_graphql_failed',
          error: errorMsg,
        },
        `DataHub GraphQL request failed: ${errorMsg}`,
      );
      throw error;
    }
  }

  /**
   * Check if a tag exists in DataHub.
   */
  async tagExists(tagUrn: string): Promise<boolean> {
    try {
      const query = `
        query getTag($urn: String!) {
          tag(urn: $urn) {
            urn
            name
            description
          }
        }
      `;

      const result = await this.executeGraphQL(query, { urn: tagUrn });

      const exists = result.tag !== null;

      logger.info(
        {
          event: 'tag_exists',
          tagUrn,
          exists,
        },
        `Tag ${tagUrn} ${exists ? 'exists' : 'does not exist'} in DataHub`,
      );

      return exists;
    } catch (error) {
      // If tag doesn't exist, GraphQL will return an error
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (
        errorMsg.includes('Could not find') ||
        errorMsg.includes('not found')
      ) {
        logger.info(
          {
            event: 'tag_exists',
            tagUrn,
            exists: false,
          },
          `Tag ${tagUrn} does not exist in DataHub`,
        );
        return false;
      }

      // For other errors, log and assume tag doesn't exist
      logger.warn(
        {
          event: 'tag_exists_check_failed',
          tagUrn,
          error: errorMsg,
        },
        `Failed to check if tag ${tagUrn} exists, assuming it doesn't`,
      );
      return false;
    }
  }

  /**
   * Create a tag in DataHub.
   */
  async createTag(name: string, description: string): Promise<string> {
    try {
      logger.info(
        {
          event: 'tag_creation_started',
          name,
          description,
        },
        `Starting tag creation for ${name}`,
      );

      const query = `
        mutation createTag($input: CreateTagInput!) {
          createTag(input: $input) {
            urn
            name
            description
          }
        }
      `;

      const variables = {
        input: {
          name,
          description,
        },
      };

      const result = await this.executeGraphQL(query, variables);

      if (result.createTag) {
        const tagUrn = result.createTag.urn;
        logger.info(
          {
            event: 'tag_created',
            tagUrn,
            name,
          },
          `Successfully created tag ${tagUrn}`,
        );
        return tagUrn;
      } else {
        throw new Error('Create tag mutation returned no result');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(
        {
          event: 'tag_creation_failed',
          name,
          error: errorMsg,
        },
        `Failed to create tag ${name}: ${errorMsg}`,
      );
      throw error;
    }
  }

  /**
   * Ensure a tag exists in DataHub, creating it if necessary.
   * This is idempotent and safe to call repeatedly.
   */
  async ensureTag(
    tagUrn: string,
    name: string,
    description: string,
  ): Promise<boolean> {
    try {
      logger.info(
        {
          event: 'tag_provisioning_start',
          tagUrn,
          name,
        },
        `Starting tag provisioning for ${tagUrn}`,
      );

      // Check if tag already exists
      const exists = await this.tagExists(tagUrn);

      if (exists) {
        logger.info(
          {
            event: 'tag_provisioning_skipped',
            tagUrn,
            reason: 'already_exists',
          },
          `Tag ${tagUrn} already exists, skipping creation`,
        );
        return true;
      }

      // Create the tag
      try {
        const createdUrn = await this.createTag(name, description);

        // Verify the created URN matches what we expected
        if (createdUrn === tagUrn) {
          logger.info(
            {
              event: 'tag_provisioning_succeeded',
              tagUrn,
            },
            `Successfully provisioned tag ${tagUrn}`,
          );
          return true;
        } else {
          logger.warn(
            {
              event: 'tag_provisioning_urn_mismatch',
              expectedUrn: tagUrn,
              createdUrn,
            },
            `Created tag URN ${createdUrn} doesn't match expected ${tagUrn}`,
          );
          return false;
        }
      } catch (createError) {
        // Handle race condition where tag was created by another process
        const errorMsg =
          createError instanceof Error
            ? createError.message
            : String(createError);
        if (
          errorMsg.includes('already exists') ||
          errorMsg.includes('duplicate')
        ) {
          logger.info(
            {
              event: 'tag_provisioning_race_condition',
              tagUrn,
            },
            `Tag ${tagUrn} was created by another process, treating as success`,
          );

          // Verify it now exists
          const nowExists = await this.tagExists(tagUrn);
          return nowExists;
        }

        // For other errors, log and return failure
        logger.error(
          {
            event: 'tag_provisioning_failed',
            tagUrn,
            error: errorMsg,
          },
          `Failed to provision tag ${tagUrn}: ${errorMsg}`,
        );
        return false;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(
        {
          event: 'tag_provisioning_failed',
          tagUrn,
          error: errorMsg,
        },
        `Exception during tag provisioning for ${tagUrn}: ${errorMsg}`,
      );
      return false;
    }
  }

  /**
   * Ensure all LineageGuard tags exist in DataHub.
   */
  async ensureLineageGuardTags(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [key, tag] of Object.entries(LINEAGEGUARD_TAGS)) {
      results[key] = await this.ensureTag(tag.urn, tag.name, tag.description);
    }

    const succeeded = Object.values(results).filter((v) => v).length;
    const failed = Object.values(results).filter((v) => !v).length;

    logger.info(
      {
        event: 'lineageguard_tags_provisioning_complete',
        succeeded,
        failed,
        results,
      },
      `LineageGuard tags provisioning complete: ${succeeded}/${succeeded + failed} succeeded`,
    );

    return results;
  }
}
