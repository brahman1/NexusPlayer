import { alignToEpgSlot, epgProgrammeLayout, isProgrammeLive, shiftHours } from '../services/epgTimeline';

describe('grille EPG', () => {
  it('aligne le créneau sur la demi-heure', () => {
    expect(alignToEpgSlot(new Date('2026-09-27T12:47:42.000Z')).toISOString()).toBe('2026-09-27T12:30:00.000Z');
  });

  it('calcule une position tronquée à la fenêtre visible', () => {
    const start = new Date('2026-09-27T12:00:00.000Z');
    const end = shiftHours(start, 4);
    expect(epgProgrammeLayout('2026-09-27T11:30:00.000Z', '2026-09-27T13:00:00.000Z', start, end)).toEqual({ left: 0, width: 240 });
    expect(epgProgrammeLayout('2026-09-27T15:30:00.000Z', '2026-09-27T17:00:00.000Z', start, end)).toEqual({ left: 840, width: 120 });
  });

  it('identifie le programme diffusé en direct', () => {
    const now = new Date('2026-09-27T12:30:00.000Z').getTime();
    expect(isProgrammeLive('2026-09-27T12:00:00.000Z', '2026-09-27T13:00:00.000Z', now)).toBe(true);
    expect(isProgrammeLive('2026-09-27T13:00:00.000Z', '2026-09-27T14:00:00.000Z', now)).toBe(false);
  });
});
