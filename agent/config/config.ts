import { env } from "./env";
import { maskToken } from "../utils/security.js";

export interface AppConfig {

  github: {

    owner: string;

    repository: string;

    baseBranch: string;

    token: string;

  };

  datahub: {

    url: string;

    token: string;

  };

  anthropic: {

    apiKey: string;

  };

  logging: {

    level: string;

  };

}

export const config: AppConfig = {

  github: {

    owner: env.GITHUB_OWNER,

    repository: env.GITHUB_REPOSITORY,

    baseBranch: env.GITHUB_BASE_BRANCH,

    token: env.GITHUB_TOKEN,

  },

  datahub: {

    url: env.DATAHUB_GMS_URL,

    token: env.DATAHUB_GMS_TOKEN,

  },

  anthropic: {

    apiKey: env.ANTHROPIC_API_KEY,

  },

  logging: {

    level: env.LOG_LEVEL,

  },

};

// Safe config for logging (tokens masked)
export const safeConfig = {
  github: {
    owner: config.github.owner,
    repository: config.github.repository,
    baseBranch: config.github.baseBranch,
    token: maskToken(config.github.token),
  },
  datahub: {
    url: config.datahub.url,
    token: maskToken(config.datahub.token),
  },
  anthropic: {
    apiKey: maskToken(config.anthropic.apiKey),
  },
  logging: {
    level: config.logging.level,
  },
};