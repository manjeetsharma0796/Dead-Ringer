import { makeSuspects } from "./mock";

/* Round 7 case files — one deterministic set shared by every screen. */
export const SUSPECTS = makeSuspects(7);

export function suspectById(id: number) {
  return SUSPECTS.find((s) => s.id === id);
}
