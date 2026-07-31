import { DataHubClient } from "@/mcp";

import { MetadataWriter } from "./metadata-writer";
import { ImpactReport } from "./types";

export class DataHubWriter
  implements MetadataWriter {

  constructor(
    private readonly client: DataHubClient
  ) {}

  async write(
    report: ImpactReport
  ): Promise<void> {

    // ----------------------------------------
    // Dataset Documentation
    // ----------------------------------------

    for (const asset of report.affectedAssets) {

      await this.client.updateDocumentation({

        urn: asset.urn,

        content: this.buildDocumentation(
          report
        ),

      });

    }

    // ----------------------------------------
    // Structured Properties
    // ----------------------------------------

    for (const asset of report.affectedAssets) {

      await this.client.updateStructuredProperties({

        urn: asset.urn,

        properties: {

          lineageGuardRiskScore:
            report.score,

          lineageGuardRiskLevel:
            report.level,

          requiresApproval:
            report.requiresApproval,

          generatedAt:
            report.generatedAt,

        },

      });

    }

    // ----------------------------------------
    // Governance Tags
    // ----------------------------------------

    for (const asset of report.affectedAssets) {

      if (report.level === "CRITICAL") {

        await this.client.addTag({

          urn: asset.urn,

          tag: "CriticalChange",

        });

      }

      if (report.requiresApproval) {

        await this.client.addTag({

          urn: asset.urn,

          tag: "ApprovalRequired",

        });

      }

    }

    // ----------------------------------------
    // Audit Comment
    // ----------------------------------------

    for (const asset of report.affectedAssets) {

      await this.client.createComment({

        urn: asset.urn,

        comment: this.buildComment(
          report
        ),

      });

    }

  }

  private buildDocumentation(
    report: ImpactReport
  ): string {

    return `
# LineageGuard Impact Report

Summary

${report.summary}

Risk

${report.level} (${report.score}/100)

Approval Required

${report.requiresApproval ? "Yes" : "No"}

Recommendations

${report.recommendations
  .map(r => `- ${r.title}`)
  .join("\n")}
`.trim();

  }

  private buildComment(
    report: ImpactReport
  ): string {

    return [
      "LineageGuard generated an impact assessment.",
      "",
      `Risk: ${report.level} (${report.score})`,
      `Approval Required: ${report.requiresApproval}`,
    ].join("\n");

  }

}