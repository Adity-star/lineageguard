import { GenerationResult } from "../../generators/types.js";
import { ContextBundle } from "../../context/type.js";
import { logger } from "../../config/logger.js";
import { ChangedFile } from "../types/changed-file";

export class GitService {

  buildFiles(
    generation: GenerationResult
  ): ChangedFile[] {

    return [

      {
        path: "schema.prisma",
        content: generation.prisma.schema
      },

      {
        path: "migration.sql",
        content: generation.sql.formatted
      },

      {
        path: "rollback.sql",
        content: generation.rollback.sql
      },

      {
        path: "CHANGELOG.md",
        content: generation.documentation.markdown
      }

    ];

  }

}