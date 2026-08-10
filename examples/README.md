# LineageGuard Example

LineageGuard turns a natural-language database change request into a governed, auditable change.

```
Request
   ↓
Understand
   ↓
Analyze
   ↓
Generate
   ↓
Approve
   ↓
Deliver
```

## This Example

1. **Request** — User asks to add a column.
2. **Context** — LineageGuard retrieves real metadata from DataHub.
3. **Plan & Analyze** — The LLM creates a structured plan while LineageGuard evaluates risk and impact.
4. **Generate** — A platform-aware migration and rollback are generated and validated.
5. **Deliver** — Once approved, LineageGuard creates the GitHub PR and writes governance metadata back to DataHub.

## Key Idea

The LLM understands the request; LineageGuard's deterministic governance pipeline decides how the change should safely proceed.