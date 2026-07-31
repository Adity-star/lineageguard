import { logger } from "../config/logger.js";
import { gracefulShutdown } from "../utils/shutdown.js";

logger.info("Starting LineageGuard Engine");

process.on("SIGINT", gracefulShutdown);

process.on("SIGTERM", gracefulShutdown);

logger.info("Engine Ready");