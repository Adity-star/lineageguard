import { GenerationResult } from '../../generators/types.js';
import { ContextBundle } from '../../context/type.js';
import { logger } from '../../config/logger.js';
import { ChangedFile } from '../types/changed-file.js';

export class GitService {
  buildFiles(generation: GenerationResult): ChangedFile[] {
    return [
      {
        path: 'migration.sql',
        content: generation.ddl.ddl,
      },

      {
        path: 'rollback.sql',
        content: generation.rollback.sql,
      },

      {
        path: 'CHANGELOG.md',
        content: generation.documentation.markdown,
      },
    ];
  }
}
