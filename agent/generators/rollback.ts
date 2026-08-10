import { ExecutionPlan } from '../planner/types.js';
import { logger } from '../config/logger.js';

import { RollbackArtifact } from './types.js';

export class RollbackGenerator {
  generate(plan: ExecutionPlan): RollbackArtifact {
    logger.info(
      {
        event: 'rollback_generation_start',
        requiredChanges: plan.requiredChanges,
        affectedColumns: plan.affectedColumns,
      },
      'Generating rollback SQL',
    );

    if (!plan.requiredChanges || plan.requiredChanges.length === 0) {
      return {
        automatic: false,
        sql: '-- No changes to rollback.',
        operationType: 'none',
      };
    }

    // Determine primary operation type
    const operationType = this.determineOperationType(plan);

    // Check if we have mixed operation types (e.g., rename + drop)
    const changeTypes = new Set(
      plan.requiredChanges.map(c => c.type?.toLowerCase().trim().replace(/\s+/g, '_') || '')
    );
    const hasMixedOperations = changeTypes.size > 1;

    // For DROP COLUMN operations, resolve hierarchical conflicts and deduplicate
    let dropColumnsToProcess: string[] = [];
    if (plan.affectedColumns && plan.affectedColumns.length > 0) {
      dropColumnsToProcess = this.resolveDropColumnConflicts(plan.affectedColumns);
      logger.info(
        {
          event: 'rollback_drop_column_conflict_resolution',
          originalColumns: plan.affectedColumns,
          resolvedColumns: dropColumnsToProcess,
        },
        `Rollback: Resolved DROP COLUMN conflicts: ${plan.affectedColumns.length} -> ${dropColumnsToProcess.length} columns`,
      );
    }

    // For pure DROP COLUMN operations, use exact affectedColumns from plan
    if (!hasMixedOperations && operationType === 'drop_column' && dropColumnsToProcess.length > 0) {
      const rollbackStatements = dropColumnsToProcess.map((columnName) => {
        return `-- Manual rollback required.\n-- Restore dropped column from backup:\n-- ${columnName}`;
      });

      const sql = rollbackStatements.join('\n\n');

      logger.info(
        {
          event: 'rollback_generation_complete',
          automatic: false,
          statementCount: rollbackStatements.length,
          operationType,
          affectedColumns: dropColumnsToProcess,
        },
        `Rollback SQL generated: manual`,
      );

      return {
        automatic: false,
        sql,
        operationType,
      };
    }

    // Process each required change to generate rollback SQL (for mixed or other operation types)
    const rollbackStatements = plan.requiredChanges.map((change) => {
      const changeType = change.type?.toLowerCase().trim().replace(/\s+/g, '_') || '';

      if (changeType === 'add_column') {
        // For ADD COLUMN, rollback is DROP COLUMN
        const columnName = change.sourceColumn || this.extractColumnName(change);
        if (columnName) {
          return `ALTER TABLE ${plan.affectedDataset || '<table>'} DROP COLUMN ${columnName};`;
        }
      }

      if (changeType === 'drop_column') {
        // For DROP COLUMN, use resolved affectedColumns if available, otherwise extract from change
        if (dropColumnsToProcess.length > 0) {
          // For mixed operations, match affectedColumns to this change
          const dropColumns = dropColumnsToProcess.filter(col => {
            if (change.sourceColumn) {
              return col === change.sourceColumn || col.startsWith(change.sourceColumn + '.');
            }
            return true;
          });

          return dropColumns.map(col => 
            `-- Manual rollback required.\n-- Restore dropped column from backup:\n-- ${col}`
          ).join('\n\n');
        }
        
        // Fallback to extracting from change
        const columnName = change.sourceColumn || this.extractColumnName(change);
        if (columnName) {
          return `-- Manual rollback required.\n-- Restore dropped column from backup:\n-- ${columnName}`;
        }
      }

      if (changeType === 'rename_column') {
        // For RENAME COLUMN, rollback is reverse rename
        const renameColumns = this.extractRenameColumns(change);
        if (renameColumns) {
          const { sourceColumn, targetColumn } = renameColumns;
          return `ALTER TABLE ${plan.affectedDataset || '<table>'} RENAME COLUMN ${targetColumn} TO ${sourceColumn};`;
        }
        return '-- Manual rollback required for rename (could not extract source/target columns)';
      }

      return '-- Manual rollback required for this change type.';
    });

    const sql = rollbackStatements.join('\n\n');
    const automatic = rollbackStatements.some(s => !s.startsWith('--'));

    logger.info(
      {
        event: 'rollback_generation_complete',
        automatic,
        statementCount: rollbackStatements.length,
        operationType,
      },
      `Rollback SQL generated: ${automatic ? 'automatic' : 'manual'}`,
    );

    return {
      automatic,
      sql,
      operationType,
    };
  }

  private determineOperationType(plan: ExecutionPlan): string {
    if (!plan.requiredChanges || plan.requiredChanges.length === 0) {
      return 'unknown';
    }

    const firstChange = plan.requiredChanges[0];
    if (!firstChange) {
      return 'unknown';
    }
    const changeType =
      firstChange.type?.toLowerCase().trim().replace(/\s+/g, '_') || '';

    if (changeType.includes('add') && changeType.includes('column')) {
      return 'add_column';
    }
    if (changeType.includes('drop') && changeType.includes('column')) {
      return 'drop_column';
    }
    if (changeType.includes('rename') && changeType.includes('column')) {
      return 'rename_column';
    }

    return 'unknown';
  }

  private extractColumnName(change: any): string | null {
    // Try to extract column name from description
    const description = change.description || '';

    // Skip generic descriptions that don't specify exact columns
    if (description.toLowerCase().includes('and its subfields') || 
        description.toLowerCase().includes('and subfields')) {
      return null;
    }

    // Match patterns like "Add column Customerbalance_1" or "Drop column shipment_info.geo_info.lat"
    // Supports nested column paths with dots
    const match = description.match(
      /(?:add|drop|rename)\s+(?:column\s+)?([\w.]+)/i,
    );
    if (match) {
      return match[1];
    }

    // Also check affectedColumns in the plan
    if (change.columnName) {
      return change.columnName;
    }

    return null;
  }


  private resolveDropColumnConflicts(columns: string[]): string[] {
    if (!columns || columns.length === 0) {
      return [];
    }

    // Remove duplicates first
    const uniqueColumns = [...new Set(columns)];

    // Build hierarchy map
    const hierarchy = new Map<string, string[]>();
    for (const col of uniqueColumns) {
      const segments = col.split('.');
      for (let i = 0; i < segments.length; i++) {
        const parent = segments.slice(0, i).join('.');
        if (parent) {
          if (!hierarchy.has(parent)) {
            hierarchy.set(parent, []);
          }
          hierarchy.get(parent)!.push(col);
        }
      }
    }

    // Determine which columns to keep
    const columnsToKeep = new Set<string>();
    const columnsToRemove = new Set<string>();

    for (const col of uniqueColumns) {
      const isParent = hierarchy.has(col);
      
      if (isParent) {
        // This is a parent field
        const children = hierarchy.get(col) || [];
        
        // Check if any children are also being dropped
        const childrenBeingDropped = children.filter(child => uniqueColumns.includes(child));
        
        if (childrenBeingDropped.length > 0) {
          // Parent and children both being dropped - keep only parent (more efficient)
          columnsToKeep.add(col);
          childrenBeingDropped.forEach(child => columnsToRemove.add(child));
        } else {
          // Only parent being dropped
          columnsToKeep.add(col);
        }
      } else {
        // This is a child field
        const parent = col.split('.').slice(0, -1).join('.');
        
        if (parent && uniqueColumns.includes(parent)) {
          // Parent is also being dropped - let parent handle it
          columnsToRemove.add(col);
        } else {
          // Only child being dropped
          columnsToKeep.add(col);
        }
      }
    }

    const resolved = Array.from(columnsToKeep).filter(col => !columnsToRemove.has(col));
    
    return resolved;
  }

  /**
   * Extract source and target columns from rename description (fallback).
   * Supports patterns like "Rename column A to B" or "Rename A to B"
   */
  private extractRenameColumns(change: any): { sourceColumn: string; targetColumn: string } | null {
    // First check if already provided
    if (change.sourceColumn && change.targetColumn) {
      return {
        sourceColumn: change.sourceColumn,
        targetColumn: change.targetColumn
      };
    }

    const description = change.description || '';
    
    // Match patterns like "Rename column shipment_info.target to customer_target"
    // or "Rename shipment_info.target to customer_target"
    const match = description.match(/(?:rename\s+(?:column\s+)?)?([\w.]+)\s+to\s+([\w.]+)/i);
    
    if (match && match[1] && match[2]) {
      return {
        sourceColumn: match[1],
        targetColumn: match[2]
      };
    }
    
    return null;
  }
}
