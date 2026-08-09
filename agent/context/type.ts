import {
  Dataset,
  SchemaField,
  Lineage,
  DatasetQuery,
  Document,
} from '../mcp/types.js';

export interface RawContext {
  dataset?: Dataset;

  schema?: SchemaField[];

  lineage?: Lineage;

  queries?: DatasetQuery[];

  documents?: Document[];
}

export interface ContextProvenance {
  datasetUrn: string;
  retrievedAt: string;
  source: 'datahub' | 'fallback';
  catalogVersion?: string;
  retrievalDurationMs: number;
}

export interface DataQuality {
  passedChecks: number;
  failedChecks: number;
  lastChecked?: string;
}

export interface Domain {
  urn: string;
  name: string;
  description?: string;
}

export interface Certification {
  certified: boolean;
  level?: string;
  lastCertified?: string;
  certifier?: string;
}

export interface Deprecation {
  deprecated: boolean;
  note?: string;
  decommissionDate?: string;
}

export interface RelatedDashboard {
  urn: string;
  name: string;
  url?: string;
}

export interface RelatedPipeline {
  urn: string;
  name: string;
  platform: string;
}

export interface RelatedDbtModel {
  urn: string;
  name: string;
  package: string;
}

export interface ContextBundle {
  // Core metadata
  dataset: Dataset;

  schema: SchemaField[];

  lineage: Lineage;

  // Documentation
  queries: DatasetQuery[];

  documents: Document[];

  // Extended metadata
  owners: Array<{ urn: string; name: string; type: string }>;
  glossaryTerms: Array<{ urn: string; name: string; description?: string }>;
  tags: string[];
  structuredProperties: Record<string, any>;

  // Usage and quality
  usage: {
    queryCount: number;
    lastQueried?: string;
    topUsers?: Array<{ user: string; count: number }>;
  };
  quality: DataQuality;

  // Governance
  domain?: Domain | undefined;
  certification: Certification;
  deprecation: Deprecation;

  // Related assets
  relatedDashboards: RelatedDashboard[];
  relatedPipelines: RelatedPipeline[];
  relatedDbtModels: RelatedDbtModel[];

  // Statistics
  statistics: {
    totalFields: number;
    upstreamCount: number;
    downstreamCount: number;
    queryCount: number;
    documentCount: number;
    ownerCount: number;
    glossaryTermCount: number;
    tagCount: number;
    dashboardCount: number;
    pipelineCount: number;
    dbtModelCount: number;
  };

  // Provenance
  provenance: ContextProvenance;
}
