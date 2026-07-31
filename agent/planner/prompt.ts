import { ChangeRequest, ContextBundle } from "@/models";

export interface PromptMessages {
  system: string;
  user: string;
}

export class PlanningPromptBuilder {
  build(
    request: ChangeRequest,
    context: ContextBundle
  ): PromptMessages {
    return {
      system: this.buildSystemPrompt(),
      user: this.buildUserPrompt(request, context),
    };
  }

  private buildSystemPrompt(): string {
    return `
You are an expert data platform architect.

Your task is to analyze a requested metadata change and create a structured execution plan.

Rules:

- Respond ONLY with valid JSON.
- Do not include markdown.
- Do not explain your reasoning.
- Do not invent datasets or columns.
- Use only the supplied context.
- If information is missing, include it under "missingInformation".
- Set requiresApproval=true for potentially breaking changes.
- Confidence must be between 0 and 1.

Return JSON matching this structure:

{
  "summary": "...",
  "intent": "...",
  "affectedDataset": "...",
  "affectedColumns": [],
  "assumptions": [],
  "missingInformation": [],
  "requiredChanges": [
    {
      "type": "...",
      "description": "..."
    }
  ],
  "confidence": 0.95,
  "requiresApproval": false
}
`.trim();
  }

  private buildUserPrompt(
    request: ChangeRequest,
    context: ContextBundle
  ): string {
    return JSON.stringify(
      {
        request,
        context,
      },
      null,
      2
    );
  }
}