import { ImpactReport } from "./types.js";
import { ContextBundle } from "../context/type.js";

export interface MetadataWriter {
  /**
   * Persist an impact report back into DataHub.
   * The context is passed so the writer knows which dataset URN to target.
   */
  write(report: ImpactReport, context: ContextBundle): Promise<void>;
}
