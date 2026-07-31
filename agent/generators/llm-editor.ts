import { ExecutionPlan } from "@/planning";

export interface SchemaEditorRequest {
  schema: string;
  plan: ExecutionPlan;
}

export interface SchemaEditorResponse {
  updatedSchema: string;
}

export interface LLMEditor {
  editSchema(
    request: SchemaEditorRequest
  ): Promise<SchemaEditorResponse>;
}