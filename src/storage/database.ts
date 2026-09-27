import * as SQLite from 'expo-sqlite';

import { categoryDisplayName, categorySortKey, channelDisplayName, naturalSortKey } from '../services/channelPresentation';
import { DATABASE_VERSION, migrationV1, migrationV2, migrationV3, migrationV4, migrationV5, migrationV6 } from './migrations';

const DATABASE_NAME = 'nexusplayer.db';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function backfillPresentationNames(database: SQLite.SQLiteDatabase) {
  const [categories, channels] = await Promise.all([
    database.getAllAsync<{ id: string; name: string }>('SELECT id, name FROM categories'),
    database.getAllAsync<{ id: string; name: string }>('SELECT id, name FROM channels'),
  ]);
  const categoryStatement = await database.prepareAsync('UPDATE categories SET display_name = ?, sort_name = ? WHERE id = ?');
  const channelStatement = await database.prepareAsync('UPDATE channels SET display_name = ?, sort_name = ? WHERE id = ?');
  try {
    for (const category of categories) {
      await categoryStatement.executeAsync(categoryDisplayName(category.name), categorySortKey(category.name), category.id);
    }
    for (const channel of channels) {
      const displayName = channelDisplayName(channel.name);
      await channelStatement.executeAsync(displayName, naturalSortKey(displayName), channel.id);
    }
  } finally {
    await categoryStatement.finalizeAsync();
    await channelStatement.finalizeAsync();
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
