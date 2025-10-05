/**
 * Application logger configured with pino. Pretty printing enabled in non-production.
 */
import pino from "pino";
import { config } from "../config";

const isTest = config.NODE_ENV === "test";
const silent = isTest && config.TEST_VERBOSE_LOG !== "1";

const logger = pino({
  level: silent ? "silent" : config.LOG_LEVEL,
  transport:
    !silent && config.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: { colorize: true },
        }
      : undefined,
});

export default logger;
