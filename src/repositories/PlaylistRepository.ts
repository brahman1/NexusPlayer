import type { Playlist } from '../types/domain';

export type CreatePlaylistInput = Pick<Playlist, 'id' | 'name' | 'sourceKind' | 'endpoint'>;

export interface PlaylistRepository {
  list(): Promise<Playlist[]>;
  findById(id: string): Promise<Playlist | null>;
  create(input: CreatePlaylistInput): Promise<Playlist>;
  rename(id: string, name: string): Promise<void>;
  remove(id: string): Promise<void>;
}
