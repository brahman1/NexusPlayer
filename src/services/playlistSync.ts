import type { ParsedM3uChannel } from './m3uParser';

export type ExistingChannelSnapshot = ParsedM3uChannel & {
  isFavorite: boolean;
  lastWatchedAt: string | null;
};

export type PlaylistSyncReport = {
  added: number;
  modified: number;
  removed: number;
  unchanged: number;
};

function comparable(channel: ParsedM3uChannel) {
  return JSON.stringify([
    channel.name,
    channel.groupTitle,
    channel.tvgId,
    channel.tvgName,
    channel.logoUrl,
    channel.language,
    channel.country,
  ]);
}

export function createPlaylistSyncReport(
  existing: ExistingChannelSnapshot[],
  incoming: ParsedM3uChannel[],
): PlaylistSyncReport {
  const previousByUrl = new Map(existing.map((channel) => [channel.streamUrl, channel]));
  let added = 0;
  let modified = 0;
  let unchanged = 0;

  for (const channel of incoming) {
    const previous = previousByUrl.get(channel.streamUrl);
    if (!previous) added += 1;
    else if (comparable(previous) === comparable(channel)) unchanged += 1;
    else modified += 1;
    previousByUrl.delete(channel.streamUrl);
  }

  return { added, modified, removed: previousByUrl.size, unchanged };
}
