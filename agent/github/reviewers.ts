import { ContextBundle } from "@/context";

export class ReviewerResolver {

  resolve(
    context: ContextBundle
  ): string[] {

    const reviewers = new Set<string>();

    if (context.owner?.githubUsername) {
      reviewers.add(context.owner.githubUsername);
    }

    if (context.domain?.githubTeam) {
      reviewers.add(context.domain.githubTeam);
    }

    return [...reviewers];

  }

}