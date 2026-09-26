import * as SQLite from 'expo-sqlite';

import { DATABASE_VERSION, migrationV1, migrationV2, migrationV3, migrationV4, migrationV5 } from './migrations';

const DATABASE_NAME = 'nexusplayer.db';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

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
