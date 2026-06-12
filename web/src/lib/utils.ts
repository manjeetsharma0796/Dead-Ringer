/* shadcn-convention class combiner (no deps needed at this scale). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
