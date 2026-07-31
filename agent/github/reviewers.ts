import { ContextBundle } from "../context/type.js";
import { logger } from "../config/logger.js";

export class ReviewerResolver {

  resolve(
    context: ContextBundle
  ): string[] {

    const reviewers = new Set<string>();

    // Add dataset owners as reviewers
    for (const owner of context.dataset.owners) {
      // Extract GitHub username from owner if available
      // This is a placeholder - in production, you'd map owner URNs to GitHub usernames
      if (owner.name) {
        reviewers.add(owner.name);
      }
    }

    return [...reviewers];

  }

}