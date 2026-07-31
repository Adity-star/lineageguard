import { GenerationResult } from "../generators/types.js";
import { ImpactReport } from "../impact/types.js";

export class PullRequestTemplate {

  build(

    generation: GenerationResult,

    impact: ImpactReport

  ): string {

    return `# Summary

${impact.summary}

---

# Risk

**${impact.level} (${impact.score}/100)**

Approval Required: ${
      impact.requiresApproval
        ? "Yes"
        : "No"
    }

---

# Generated Artifacts

- Prisma Schema
- SQL Migration
- Rollback Script
- Documentation
- dbt Changes

---

# Recommendations

${impact.recommendations.map((r) => `- ${r.title}`).join("\n")}

---

Generated automatically by LineageGuard.
`;

  }

}