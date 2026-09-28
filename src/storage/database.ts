import * as SQLite from 'expo-sqlite';

import { categoryDisplayName, categorySortKey, channelDisplayName, episodeDisplayName, inferChannelMetadata, mediaDisplayName, naturalSortKey, type CategoryKind } from '../services/channelPresentation';
import { DATABASE_VERSION, migrationV1, migrationV2, migrationV3, migrationV4, migrationV5, migrationV6, migrationV7, migrationV8, migrationV9, migrationV10 } from './migrations';

const DATABASE_NAME = 'nexusplayer.db';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function backfillPresentationNames(database: SQLite.SQLiteDatabase) {
  const [categories, channels] = await Promise.all([
    database.getAllAsync<{ id: string; name: string; kind: CategoryKind }>('SELECT id, name, kind FROM categories'),
    database.getAllAsync<{ id: string; name: string; language: string | null; country: string | null; category_name: string | null }>(`SELECT ch.id, ch.name, ch.language, ch.country, c.name AS category_name FROM channels ch LEFT JOIN categories c ON c.id = ch.category_id`),
  ]);
  const categoryStatement = await database.prepareAsync('UPDATE categories SET display_name = ?, sort_name = ? WHERE id = ?');
  const channelStatement = await database.prepareAsync('UPDATE channels SET display_name = ?, sort_name = ?, language = ?, country = ? WHERE id = ?');
  try {
    for (const category of categories) {
      await categoryStatement.executeAsync(categoryDisplayName(category.name, category.kind), categorySortKey(category.name, category.kind), category.id);
    }
    for (const channel of channels) {
      const displayName = channelDisplayName(channel.name);
      const metadata = inferChannelMetadata(channel.name, channel.category_name ?? '', channel.language, channel.country);
      await channelStatement.executeAsync(displayName, naturalSortKey(displayName), metadata.language, metadata.country, channel.id);
    }
  } finally {
    await categoryStatement.finalizeAsync();
    await channelStatement.finalizeAsync();
  }
}

async function backfillMediaPresentationNames(database: SQLite.SQLiteDatabase) {
  const [movies, series, episodes] = await Promise.all([
    database.getAllAsync<{ id: string; name: string }>('SELECT id, name FROM movies'),
    database.getAllAsync<{ id: string; name: string }>('SELECT id, name FROM series'),
    database.getAllAsync<{ id: string; name: string; season_number: number; episode_number: number }>('SELECT id, name, season_number, episode_number FROM episodes'),
  ]);
  const movieStatement = await database.prepareAsync('UPDATE movies SET display_name = ?, sort_name = ? WHERE id = ?');
  const seriesStatement = await database.prepareAsync('UPDATE series SET display_name = ?, sort_name = ? WHERE id = ?');
  const episodeStatement = await database.prepareAsync('UPDATE episodes SET display_name = ?, sort_name = ? WHERE id = ?');
  try {
    for (const item of movies) {
      const name = mediaDisplayName(item.name);
      await movieStatement.executeAsync(name, naturalSortKey(name), item.id);
    }
    for (const item of series) {
      const name = mediaDisplayName(item.name);
      await seriesStatement.executeAsync(name, naturalSortKey(name), item.id);
    }
    for (const item of episodes) {
      const name = episodeDisplayName(item.name, item.season_number, item.episode_number);
      await episodeStatement.executeAsync(name, naturalSortKey(name), item.id);
    }
  } finally {
    await Promise.all([movieStatement.finalizeAsync(), seriesStatement.finalizeAsync(), episodeStatement.finalizeAsync()]);
  }
}

async function migrate(database: SQLite.SQLiteDatabase) {
  const row = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion > DATABASE_VERSION) {
    throw new Error(
      `La base locale utilise une version plus récente (${currentVersion}) que l’application (${DATABASE_VERSION}).`,
    );
  }

  if (currentVersion < 1) {
    await database.withTransactionAsync(async () => {
      await database.execAsync(migrationV1);
      await database.execAsync('PRAGMA user_version = 1');
    });
  }

  if (currentVersion < 2) {
    await database.withTransactionAsync(async () => {
      await database.execAsync(migrationV2);
      await database.execAsync('PRAGMA user_version = 2');
    });
  }

  if (currentVersion < 3) {
    await database.withTransactionAsync(async () => {
      await database.execAsync(migrationV3);
      await database.execAsync('PRAGMA user_version = 3');
    });
  }

  if (currentVersion < 4) {
    await database.withTransactionAsync(async () => {
      await database.execAsync(migrationV4);
      await database.execAsync('PRAGMA user_version = 4');
    });
  }

  if (currentVersion < 5) {
    await database.withTransactionAsync(async () => {
      await database.execAsync(migrationV5);
      await database.execAsync('PRAGMA user_version = 5');
    });
  }

  if (currentVersion < 6) {
    await database.withTransactionAsync(async () => {
      await database.execAsync(migrationV6);
      await backfillPresentationNames(database);
      await database.execAsync('PRAGMA user_version = 6');
    });
  }

  if (currentVersion < 7) {
    await database.withTransactionAsync(async () => {
      await database.execAsync(migrationV7);
      await database.execAsync('PRAGMA user_version = 7');
    });
  }


  if (currentVersion < 8) {
    await database.withTransactionAsync(async () => {
      await database.execAsync(migrationV8);
      await backfillMediaPresentationNames(database);
      await database.execAsync('PRAGMA user_version = 8');
    });
  }

  if (currentVersion < 9) {
    await database.withTransactionAsync(async () => {
      await database.execAsync(migrationV9);
      await database.execAsync('PRAGMA user_version = 9');
    });
  }

  if (currentVersion < 10) {
    await database.withTransactionAsync(async () => {
      await database.execAsync(migrationV10);
      await backfillPresentationNames(database);
      await database.execAsync('PRAGMA user_version = 10');
    });
  }
}

export async function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME)
      .then(async (database) => {
        // journal_mode cannot be changed while a migration transaction is active.
        await database.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
        await migrate(database);
        return database;
      })
      .catch((error: unknown) => {
        databasePromise = null;
        throw error;
      });
  }

  return databasePromise;
}

export async function initializeDatabase() {
  await getDatabase();
}
