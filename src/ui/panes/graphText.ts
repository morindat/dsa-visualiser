/**
 * Graph traces keep stable internal ids (`v1`, `v2`, …) in their structured
 * fields, but the renderer draws human labels (`A`, `B`, …). Narration and the
 * auxiliary panel are for learners, so translate ids to labels at display time;
 * the trace itself keeps the stable ids the algorithm and renderer need.
 */
export function humanizeGraphText(
  text: string,
  labels: Readonly<Record<string, string>> | null,
): string {
  if (labels === null || text.length === 0) return text
  return text.replace(/\b([A-Za-z]+\d+)\b/g, (id) => labels[id] ?? id)
}
