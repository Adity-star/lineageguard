import { z } from "zod";

import { MCPClient } from "../client";

import {
  SchemaField,
  SchemaFieldSchema,
  MCPToolResponse,
} from "../types";

const SchemaFieldsSchema = z.array(
  SchemaFieldSchema
);

export class SchemaTool {
  constructor(
    private readonly client: MCPClient
  ) {}

  async getSchema(
    urn: string
  ): Promise<MCPToolResponse<SchemaField[]>> {
    return this.client.executeTool(
      "list_schema_fields",
      {
        urn,
      },
      SchemaFieldsSchema
    );
  }

  async getField(
    urn: string,
    fieldPath: string
  ): Promise<SchemaField | undefined> {
    const result =
      await this.getSchema(urn);

    return result.data.find(
      field => field.fieldPath === fieldPath
    );
  }

  async hasField(
    urn: string,
    fieldPath: string
  ): Promise<boolean> {
    const field =
      await this.getField(
        urn,
        fieldPath
      );

    return !!field;
  }
}