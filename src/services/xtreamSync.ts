export type SyncEntity = { id: string; signature: string };
export type EntitySyncReport = { added: number; modified: number; removed: number; unchanged: number };
export type XtreamSyncReport = {
  categories: EntitySyncReport;
  channels: EntitySyncReport;
  movies: EntitySyncReport;
  series: EntitySyncReport;
  episodes: EntitySyncReport;
};

export function createEntitySyncReport(existing: SyncEntity[], incoming: SyncEntity[]): EntitySyncReport {
  const previous = new Map(existing.map((item) => [item.id, item.signature]));
  let added = 0;
  let modified = 0;
  let unchanged = 0;
  for (const item of incoming) {
    const signature = previous.get(item.id);
    if (signature === undefined) added += 1;
    else if (signature === item.signature) unchanged += 1;
    else modified += 1;
    previous.delete(item.id);
  }
  return { added, modified, removed: previous.size, unchanged };
}

export function sumXtreamSyncReport(report: XtreamSyncReport) {
  return Object.values(report).reduce((total, item) => ({
    added: total.added + item.added,
    modified: total.modified + item.modified,
    removed: total.removed + item.removed,
    unchanged: total.unchanged + item.unchanged,
  }), { added: 0, modified: 0, removed: 0, unchanged: 0 });
}
