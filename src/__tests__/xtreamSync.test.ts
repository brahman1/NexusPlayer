import { createEntitySyncReport, sumXtreamSyncReport, type XtreamSyncReport } from '../services/xtreamSync';

describe('synchronisation Xtream', () => {
  it('distingue ajouts, modifications, suppressions et éléments inchangés', () => {
    expect(createEntitySyncReport(
      [{ id: '1', signature: 'A' }, { id: '2', signature: 'B' }, { id: '3', signature: 'C' }],
      [{ id: '1', signature: 'A' }, { id: '2', signature: 'B2' }, { id: '4', signature: 'D' }],
    )).toEqual({ added: 1, modified: 1, removed: 1, unchanged: 1 });
  });

  it('additionne les rapports sans données sensibles', () => {
    const row = { added: 1, modified: 2, removed: 3, unchanged: 4 };
    const report: XtreamSyncReport = { categories: row, channels: row, movies: row, series: row, episodes: row };
    expect(sumXtreamSyncReport(report)).toEqual({ added: 5, modified: 10, removed: 15, unchanged: 20 });
  });
});
