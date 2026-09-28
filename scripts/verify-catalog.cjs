// Real SQLite integration check; Node 22.13+ (no app/native dependencies).
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const db = new DatabaseSync(':memory:');
const adapter = {
  getAllAsync: async (sql, ...params) => db.prepare(sql).all(...params),
  getFirstAsync: async (sql, ...params) => db.prepare(sql).get(...params),
};
function load(relative) {
  const code = ts.transpileModule(readFileSync(resolve(__dirname, '..', relative), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: () => ({ getDatabase: async () => adapter }) });
  return exports;
}
(async () => {
  const migrations = load('src/storage/migrations.ts');
  for (let version = 1; version <= migrations.DATABASE_VERSION; version++) db.exec(migrations[`migrationV${version}`]);
  db.exec("INSERT INTO playlists(id, name, source_kind, created_at, updated_at) VALUES ('source', 'Test', 'xtream', 'now', 'now')");
  const category = db.prepare('INSERT INTO categories(id, playlist_id, name, kind) VALUES (?, ?, ?, ?)');
  const film = db.prepare('INSERT INTO movies(id, playlist_id, name, stream_url, category_id, release_year, is_favorite) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const series = db.prepare('INSERT INTO series(id, playlist_id, name, category_id, is_favorite) VALUES (?, ?, ?, ?, ?)');
  db.exec('BEGIN');
  for (const kind of ['movie', 'series']) for (let i = 0; i < 17; i++) category.run(`${kind}-${i}`, 'source', `Category ${i}`, kind);
  for (let i = 0; i < 2505; i++) {
    const name = i === 2504 ? 'Unique 100%_match' : `Title ${String(i).padStart(5, '0')}`;
    film.run(`m${i}`, 'source', name, 'https://example.test/test.mp4', `movie-${i % 17}`, 2000 + i % 25, i === 2504 ? 1 : 0);
    series.run(`s${i}`, 'source', name, `series-${i % 17}`, i === 2504 ? 1 : 0);
  }
  db.exec('COMMIT');
  const { CatalogRepository } = load('src/repositories/CatalogRepository.ts');
  const repo = new CatalogRepository();
  for (const kind of ['movie', 'series']) {
    const overview = await repo.overview(kind);
    assert.equal(overview.total, 2505);
    assert.equal(overview.groups.length, 17);
    const ids = new Set();
    for (let offset = 0; offset < 2505; offset += 48) {
      const page = await repo.page(kind, {}, offset);
      page.items.forEach((item) => ids.add(item.id));
    }
    assert.equal(ids.size, 2505, 'All imported titles must be reachable without duplicates');
    const search = await repo.page(kind, { query: '100%_' });
    assert.equal(search.total, 1);
    assert.equal(search.items[0].name, 'Unique 100%_match');
    assert.equal((await repo.page(kind, { favorites: true })).total, 1);
    const group = overview.groups[16];
    assert.equal((await repo.page(kind, { categoryId: group.id })).total, group.count);
  }
  db.close();
  console.log('Catalog SQLite OK: 2,505 films + 2,505 series; 17 categories each; full pagination, search and favorites.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
