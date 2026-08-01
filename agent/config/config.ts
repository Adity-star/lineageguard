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

  grok: {
    apiKey: string;
    model: string;
    baseURL: string;
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

  grok: {
    apiKey: env.GROK_API_KEY,
    model: env.GROK_MODEL,
    baseURL: env.GROK_BASE_URL,
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

  grok: {
    apiKey: maskToken(config.grok.apiKey),
    model: config.grok.model,
    baseURL: config.grok.baseURL,
  },

  logging: {
    level: config.logging.level,
  },
};