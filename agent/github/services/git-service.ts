import { GenerationResult } from "@/generator";

import { ChangedFile } from "../types/changed-file";

export class GitService {

  buildFiles(
    generation: GenerationResult
  ): ChangedFile[] {

    return [

      {
        path: "prisma/schema.prisma",
        content: generation.prisma.schema
      },

      {
        path: "prisma/migrations/generated/migration.sql",
        content: generation.sql.content
      },

      {
        path: "prisma/migrations/generated/rollback.sql",
        content: generation.rollback.content
      },

      {
        path: "docs/schema-change.md",
        content: generation.documentation.markdown
      }

    ];

  }

}