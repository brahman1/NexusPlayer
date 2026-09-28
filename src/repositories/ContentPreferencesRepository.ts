import { getDatabase } from '../storage/database';

export type ContentFacet = { code: string; count: number };

export class ContentPreferencesRepository {
  async countries(): Promise<ContentFacet[]> {
    const database = await getDatabase();
    return database.getAllAsync<ContentFacet>(
      `SELECT country AS code, COUNT(*) AS count FROM channels
       WHERE country IS NOT NULL AND TRIM(country) <> ''
       GROUP BY country ORDER BY count DESC, country`,
    );
  }

  async languages(): Promise<ContentFacet[]> {
    const database = await getDatabase();
    return database.getAllAsync<ContentFacet>(
      `SELECT language AS code, COUNT(*) AS count FROM channels
       WHERE language IS NOT NULL AND TRIM(language) <> ''
       GROUP BY language ORDER BY count DESC, language`,
    );
  }
}
