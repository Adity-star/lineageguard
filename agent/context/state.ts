import { ChangeRequest } from "@/models";
import { Dataset, SchemaField, Lineage, DatasetQuery, Document } from "@/mcp";

export interface ContextState {
  request: ChangeRequest;

  dataset?: Dataset;

  schema?: SchemaField[];

  lineage?: Lineage;

  queries?: DatasetQuery[];

  documents?: Document[];

  metadata: {
    startedAt: Date;
    completedStages: string[];
    warnings: string[];
  };
}

export function createContextState(
  request: ChangeRequest
): ContextState {
  return {
    request,

    metadata: {
      startedAt: new Date(),
      completedStages: [],
      warnings: [],
    },
  };
}