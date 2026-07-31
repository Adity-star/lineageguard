import { ImpactReport } from "./types";

export interface MetadataWriter {

  /**
   * Persist an impact report into the metadata platform.
   */
  write(
    report: ImpactReport
  ): Promise<void>;

}