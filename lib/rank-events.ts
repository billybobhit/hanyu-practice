import type { RankEvent } from "@/lib/types";

export const RANK_UPDATED_EVENT = "hanyu_rank_updated";

export interface RankUpdatedDetail {
  elo: number;
  languageCode?: string;
  rankEvent?: RankEvent;
}

export function dispatchRankUpdated(detail: RankUpdatedDetail) {
  window.dispatchEvent(new CustomEvent<RankUpdatedDetail>(RANK_UPDATED_EVENT, { detail }));
}
