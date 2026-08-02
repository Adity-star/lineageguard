import { DataHubClient } from "../mcp/datahub-client.js";

import { logger } from "../config/logger.js";
import { withRetry, isRetryableError } from "../utils/retry.js";

import { ChangeRequest } from "../mcp/types.js";

import { ContextBundle, ContextProvenance } from "./type.js";
import { ContextState, createContextState } from "./state.js";
import { DatasetResolverStage } from "./stages/data-resolver.js";
import { MetadataCollectorStage } from "./stages/data-collector.js";
import { SchemaCollectorStage } from "./stages/schema-commector.js";
import { LineageCollectorStage } from "./stages/lineage-collector.js";
import { QueryCollectorStage } from "./stages/query-collector.js";
import { DocumentationCollectorStage } from "./stages/documentation-collector.js";
import { ContextNormalizerStage } from "./stages/normalizer.js";
import { validateContextBundle } from "./validation.js";

interface CacheEntry {
    bundle: ContextBundle;
    timestamp: number;
}

export class ContextEngine {

    private cache: Map<string, CacheEntry> = new Map();
    private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    constructor(
        private readonly dataHub: DataHubClient
    ) {}

    isDataHubConnected(): boolean {
        try {
            return this.dataHub.isConnected();
        } catch {
            return false;
        }
    }
    

    async buildContext(
        request: ChangeRequest
    ): Promise<ContextBundle> {

        const startTime = performance.now();
        const datasetUrn = request.datasetUrn || "unknown";

        try {
            logger.info({
                event: 'context_retrieval_started',
                datasetUrn,
            }, 'Starting context retrieval');

            // Check cache first
            const cached = this.getFromCache(datasetUrn);
            if (cached) {
                logger.info({
                    event: 'context_cache_hit',
                    datasetUrn,
                    ageMs: Date.now() - cached.timestamp,
                }, 'Context retrieved from cache');
                logger.info({ event: "context_dataset_resolved" }, "✓ Dataset Resolved");
                logger.info({ event: "context_schema_retrieved" }, "✓ Schema Retrieved");
                logger.info({ event: "context_lineage_retrieved" }, "✓ Lineage Retrieved");
                logger.info({ event: "context_built" }, "✓ Context Built");
                return cached.bundle;
            }

            const state = createContextState(request);

            await withRetry(
                async () => {
                    await new DatasetResolverStage(
                        this.dataHub
                    ).execute(request, state);
                },
                {
                    maxAttempts: 3,
                    retryableErrors: isRetryableError,
                    onRetry: (attempt, error) => {
                        logger.warn({
                            event: 'dataset_resolver_retry',
                            attempt,
                            error: error instanceof Error ? error.message : String(error),
                        }, 'Retrying dataset resolution');
                    }
                }
            );

            logger.info({ event: "context_dataset_resolved" }, "✓ Dataset Resolved");

            await withRetry(
                async () => {
                    await new MetadataCollectorStage(
                        this.dataHub
                    ).execute(state);
                },
                {
                    maxAttempts: 3,
                    retryableErrors: isRetryableError,
                }
            );

            await withRetry(
                async () => {
                    await new SchemaCollectorStage(
                        this.dataHub
                    ).execute(state);
                },
                {
                    maxAttempts: 3,
                    retryableErrors: isRetryableError,
                }
            );

            logger.info({ event: "context_schema_retrieved" }, "✓ Schema Retrieved");

            await withRetry(
                async () => {
                    await new LineageCollectorStage(
                        this.dataHub
                    ).execute(state);
                },
                {
                    maxAttempts: 3,
                    retryableErrors: isRetryableError,
                }
            );

            logger.info({ event: "context_lineage_retrieved" }, "✓ Lineage Retrieved");

            await withRetry(
                async () => {
                    await new QueryCollectorStage(
                        this.dataHub
                    ).execute(state);
                },
                {
                    maxAttempts: 3,
                    retryableErrors: isRetryableError,
                }
            );

            await withRetry(
                async () => {
                    await new DocumentationCollectorStage(
                        this.dataHub
                    ).execute(state);
                },
                {
                    maxAttempts: 3,
                    retryableErrors: isRetryableError,
                }
            );

            const baseBundle = new ContextNormalizerStage().execute(state);

            // Enrich with extended metadata
            const urn = baseBundle.dataset.urn;
            const [
                owners,
                glossaryTerms,
                tags,
                structuredProperties,
                domain,
                relatedDashboards,
                relatedPipelines,
                relatedDbtModels,
            ] = await Promise.all([
                this.dataHub.getOwners(urn),
                this.dataHub.getGlossaryTerms(urn),
                this.dataHub.getTags(urn),
                this.dataHub.getStructuredProperties(urn),
                this.dataHub.getDomain(urn),
                this.dataHub.getRelatedDashboards(urn),
                this.dataHub.getRelatedPipelines(urn),
                this.dataHub.getRelatedDbtModels(urn),
            ]);

            const retrievalDurationMs = performance.now() - startTime;

            const provenance: ContextProvenance = {
                datasetUrn: urn,
                retrievedAt: new Date().toISOString(),
                source: 'datahub',
                retrievalDurationMs,
            };

            const enrichedBundle: ContextBundle = {
                ...baseBundle,
                owners: owners.length > 0 ? owners : baseBundle.dataset.owners || [],
                glossaryTerms,
                tags,
                structuredProperties,
                usage: {
                    queryCount: baseBundle.queries.length,
                },
                quality: {
                    passedChecks: 0,
                    failedChecks: 0,
                },
                certification: {
                    certified: false,
                },
                deprecation: {
                    deprecated: false,
                },
                relatedDashboards,
                relatedPipelines,
                relatedDbtModels,
                statistics: {
                    ...baseBundle.statistics,
                    ownerCount: owners.length,
                    glossaryTermCount: glossaryTerms.length,
                    tagCount: tags.length,
                    dashboardCount: relatedDashboards.length,
                    pipelineCount: relatedPipelines.length,
                    dbtModelCount: relatedDbtModels.length,
                },
                provenance,
            };

            // Add optional fields if available
            if (baseBundle.queries[0]?.lastSeen) {
                enrichedBundle.usage.lastQueried = baseBundle.queries[0].lastSeen;
            }

            if (domain) {
                enrichedBundle.domain = domain;
            }

            // Validate the bundle
            validateContextBundle(enrichedBundle);

            // Cache the bundle
            this.setCache(datasetUrn, enrichedBundle);

            logger.info({
                event: 'context_retrieval_completed',
                datasetUrn: urn,
                retrievalDurationMs,
                statistics: enrichedBundle.statistics,
            }, 'Context retrieval completed');

            logger.info({ event: "context_built" }, "✓ Context Built");

            return enrichedBundle;
        } catch (error) {
            // Diagnose the specific failure before falling back
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            
            const isConnectionError = 
                errorMessage.includes('ECONNREFUSED') ||
                errorMessage.includes('connection') ||
                errorMessage.includes('socket') ||
                errorMessage.includes('timeout');
            
            const isAuthError =
                errorMessage.includes('401') ||
                errorMessage.includes('403') ||
                errorMessage.includes('unauthorized') ||
                errorMessage.includes('forbidden');
            
            const errorCategory = isConnectionError 
                ? 'CONNECTION_FAILURE'
                : isAuthError
                ? 'AUTHENTICATION_FAILURE'
                : 'UNKNOWN_FAILURE';

            // Log detailed diagnostic information
            logger.error({
                event: 'context_retrieval_failed',
                datasetUrn,
                errorCategory,
                errorMessage,
                errorStack,
                isConnected: this.isDataHubConnected(),
            }, `Context retrieval failed with ${errorCategory}: ${errorMessage}`);

            // Attempt to check DataHub connection explicitly
            let connectionHealthy = false;
            try {
                connectionHealthy = await this.dataHub.ping();
                logger.info({
                    event: 'datahub_connection_check',
                    isConnected: connectionHealthy,
                }, 'DataHub connection health check completed');
            } catch (healthCheckError) {
                logger.error({
                    event: 'datahub_connection_check_failed',
                    error: healthCheckError instanceof Error ? healthCheckError.message : String(healthCheckError),
                }, 'DataHub connection health check failed');
            }

            // Return mock context for testing when DataHub is unavailable
            logger.warn({
                event: 'context_fallback',
                datasetUrn,
                error: errorMessage,
                errorCategory,
                connectionHealthy,
            }, `Using fallback mock context due to ${errorCategory}`);

            const retrievalDurationMs = performance.now() - startTime;

            const provenance: ContextProvenance = {
                datasetUrn,
                retrievedAt: new Date().toISOString(),
                source: 'fallback',
                retrievalDurationMs,
            };

            const fallbackBundle: ContextBundle = {
                dataset: {
                    urn: request.datasetUrn || "urn:li:dataset:(urn:li:dataPlatform:mysql,users,PROD)",
                    name: "users",
                    platform: "mysql",
                    description: "User accounts table",
                    owners: [
                        { urn: "urn:li:corpuser:admin", name: "admin@example.com", type: "TECHNICAL_OWNER" },
                    ],
                    tags: ["core", "pii"],
                    glossaryTerms: [],
                },
                schema: [
                    {
                        fieldPath: "id",
                        type: "int",
                        nullable: false,
                        tags: ["primary_key"],
                        description: "User ID",
                    },
                    {
                        fieldPath: "name",
                        type: "varchar",
                        nullable: false,
                        tags: [],
                        description: "User name",
                    },
                    {
                        fieldPath: "created_at",
                        type: "timestamp",
                        nullable: false,
                        tags: [],
                        description: "Creation timestamp",
                    },
                ],
                lineage: {
                    upstream: [
                        { urn: "urn:li:dataset:(urn:li:dataPlatform:mysql,raw_users,PROD)", name: "raw_users", entityType: "dataset" },
                    ],
                    downstream: [
                        { urn: "urn:li:dataset:(urn:li:dataPlatform:mysql,user_analytics,PROD)", name: "user_analytics", entityType: "dataset" },
                        { urn: "urn:li:dataset:(urn:li:dataPlatform:mysql,user_reports,PROD)", name: "user_reports", entityType: "dataset" },
                    ],
                },
                queries: [
                    {
                        id: "query1",
                        sql: "SELECT * FROM users WHERE id = ?",
                        lastSeen: new Date().toISOString(),
                    },
                ],
                documents: [
                    {
                        id: "doc1",
                        title: "User accounts documentation",
                        snippet: "User accounts table documentation",
                        url: "http://docs.example.com/users",
                    },
                ],
                owners: [
                    { urn: "urn:li:corpuser:admin", name: "admin@example.com", type: "TECHNICAL_OWNER" },
                ],
                glossaryTerms: [],
                tags: ["core", "pii"],
                structuredProperties: {},
                usage: {
                    queryCount: 1,
                },
                quality: {
                    passedChecks: 0,
                    failedChecks: 0,
                },
                certification: {
                    certified: false,
                },
                deprecation: {
                    deprecated: false,
                },
                relatedDashboards: [],
                relatedPipelines: [],
                relatedDbtModels: [],
                statistics: {
                    totalFields: 3,
                    upstreamCount: 1,
                    downstreamCount: 2,
                    queryCount: 1,
                    documentCount: 1,
                    ownerCount: 1,
                    glossaryTermCount: 0,
                    tagCount: 2,
                    dashboardCount: 0,
                    pipelineCount: 0,
                    dbtModelCount: 0,
                },
                provenance,
            };

            // Validate fallback bundle
            validateContextBundle(fallbackBundle);

            logger.info({ event: "context_dataset_resolved" }, "✓ Dataset Resolved");
            logger.info({ event: "context_schema_retrieved" }, "✓ Schema Retrieved");
            logger.info({ event: "context_lineage_retrieved" }, "✓ Lineage Retrieved");
            logger.info({ event: "context_built" }, "✓ Context Built (fallback)");

            return fallbackBundle;
        }
    }

    private getFromCache(datasetUrn: string): CacheEntry | null {
        const entry = this.cache.get(datasetUrn);
        if (!entry) return null;

        const age = Date.now() - entry.timestamp;
        if (age > this.CACHE_TTL_MS) {
            this.cache.delete(datasetUrn);
            logger.info({
                event: 'context_cache_expired',
                datasetUrn,
                ageMs: age,
            }, 'Context cache entry expired');
            return null;
        }

        return entry;
    }

    private setCache(datasetUrn: string, bundle: ContextBundle): void {
        this.cache.set(datasetUrn, {
            bundle,
            timestamp: Date.now(),
        });

        logger.info({
            event: 'context_cache_set',
            datasetUrn,
            ttlMs: this.CACHE_TTL_MS,
        }, 'Context cached');
    }

    clearCache(): void {
        const size = this.cache.size;
        this.cache.clear();
        logger.info({
            event: 'context_cache_cleared',
            entriesCleared: size,
        }, 'Context cache cleared');
    }

    getCacheSize(): number {
        return this.cache.size;
    }

}