import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { FocusableCard } from '../components/FocusableCard';
import { ActionButton, EmptyState, FilterChip, LoadingSkeleton, PageHeader, Panel } from '../components/NexusUI';
import { Screen } from '../components/Screen';
import { EpgRepository, type GuideProgramme } from '../repositories/EpgRepository';
import { alignToEpgSlot, EPG_PIXELS_PER_MINUTE, EPG_SLOT_MINUTES, EPG_WINDOW_HOURS, epgProgrammeLayout, isProgrammeLive, shiftHours } from '../services/epgTimeline';
import { colors, radii, spacing } from '../theme/tokens';
import { getAppLanguage, translate, useI18n } from '../i18n';

const repository = new EpgRepository();
const CHANNEL_WIDTH = 220;
const TIMELINE_WIDTH = EPG_WINDOW_HOURS * 60 * EPG_PIXELS_PER_MINUTE;
const GRID_WIDTH = CHANNEL_WIDTH + TIMELINE_WIDTH;

type GuideView = 'now' | 'grid' | 'programme';
type ChannelSchedule = { channelId: string; channelName: string; programmes: GuideProgramme[] };

export function GuideScreen() {
  const { tx } = useI18n();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = !Platform.isTV && width < 600;
  const [items, setItems] = useState<GuideProgramme[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<GuideView>('now');
  const [windowStart, setWindowStart] = useState(() => alignToEpgSlot(new Date()));
  const [now, setNow] = useState(() => Date.now());
  const [selected, setSelected] = useState<GuideProgramme | null>(null);
  const windowEnd = useMemo(() => shiftHours(windowStart, EPG_WINDOW_HOURS), [windowStart]);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    repository.guideRange(windowStart, windowEnd)
      .then((programmes) => { if (active) setItems(programmes); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [windowEnd, windowStart]);
  useFocusEffect(load);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const schedules = useMemo(() => {
    const grouped = new Map<string, ChannelSchedule>();
    for (const item of items) {
      const schedule = grouped.get(item.channelId) ?? { channelId: item.channelId, channelName: item.channelName, programmes: [] };
      schedule.programmes.push(item);
      grouped.set(item.channelId, schedule);
    }
    return [...grouped.values()];
  }, [items]);
  const liveItems = useMemo(() => items.filter((item) => isProgrammeLive(item.startsAt, item.endsAt, now)), [items, now]);

  const openProgramme = useCallback((item: GuideProgramme) => {
    setSelected(item);
    setView('programme');
  }, []);
  const resetToNow = useCallback(() => {
    setWindowStart(alignToEpgSlot(new Date()));
    setView('now');
  }, []);
  const moveDay = useCallback((days: number) => {
    setWindowStart((current) => shiftHours(current, days * 24));
    setView('grid');
  }, []);

  return <Screen navigation><View style={[styles.container, compact && styles.containerCompact]}>
    <PageHeader eyebrow={tx('PROGRAMMES', 'PROGRAMS')} title="TV Guide" subtitle={`${formatDay(windowStart)} · ${formatTime(windowStart)}–${formatTime(windowEnd)}`} />
    <View style={styles.toolbar}>
      <View style={styles.filters}>
        <FilterChip active={view === 'now'} label={tx('Maintenant', 'Now')} onPress={resetToNow} />
        <FilterChip active={view === 'grid'} label={tx('Grille', 'Schedule')} onPress={() => setView('grid')} />
        <FilterChip active={view === 'programme'} label={tx('Programme', 'Program')} onPress={() => { if (selected) setView('programme'); }} />
      </View>
      <View style={styles.navigation}>
        <ActionButton icon="chevron-back" label={tx('Jour précédent', 'Previous day')} onPress={() => moveDay(-1)} variant="secondary" />
        <ActionButton label={tx('Aujourd’hui', 'Today')} onPress={resetToNow} variant="secondary" />
        <ActionButton icon="chevron-forward" label={tx('Jour suivant', 'Next day')} onPress={() => moveDay(1)} variant="secondary" />
      </View>
    </View>

    {view === 'programme' && selected ? <ProgrammeDetail item={selected} onBack={() => setView('grid')} onWatch={() => router.push({ pathname: '/player/[channelId]', params: { channelId: selected.channelId } })} />
      : loading ? <LoadingSkeleton rows={6} />
        : items.length === 0 ? <EmptyState icon="calendar-outline" title={tx('Guide indisponible', 'Guide unavailable')} detail={tx('Aucun programme n’est disponible sur ce créneau. Vérifiez la source XMLTV ou choisissez un autre jour.', 'No program is available in this time slot. Check the XMLTV source or choose another day.')} />
          : view === 'now' ? <NowList items={liveItems} now={now} onSelect={openProgramme} />
            : <GuideGrid items={schedules} now={now} onSelect={openProgramme} windowEnd={windowEnd} windowStart={windowStart} />}

    {view === 'grid' && <View style={styles.slotNavigation}><ActionButton icon="play-back" label="-2 h" onPress={() => setWindowStart((current) => shiftHours(current, -2))} variant="secondary" /><ActionButton icon="locate" label={tx('Maintenant', 'Now')} onPress={resetToNow} variant="secondary" /><ActionButton icon="play-forward" label="+2 h" onPress={() => setWindowStart((current) => shiftHours(current, 2))} variant="secondary" /></View>}
  </View></Screen>;
}

function NowList({ items, now, onSelect }: { items: GuideProgramme[]; now: number; onSelect: (item: GuideProgramme) => void }) {
  if (items.length === 0) return <EmptyState icon="time-outline" title={translate('Aucun direct renseigné', 'No live programs listed')} detail={translate('La grille existe, mais aucun programme ne couvre l’heure actuelle.', 'The schedule exists, but no program covers the current time.')} />;
  return <FlatList contentContainerStyle={styles.list} data={items} initialNumToRender={14} keyExtractor={(item) => item.id} maxToRenderPerBatch={14} removeClippedSubviews renderItem={({ item, index }) => {
    const duration = new Date(item.endsAt).getTime() - new Date(item.startsAt).getTime();
    const progress = duration > 0 ? Math.max(0, Math.min(1, (now - new Date(item.startsAt).getTime()) / duration)) : 0;
    return <FocusableCard autoFocus={index === 0} onPress={() => onSelect(item)} style={styles.nowRow}>
      <View style={styles.nowTime}><Text style={styles.timeText}>{formatTime(new Date(item.startsAt))}</Text><Text numberOfLines={1} style={styles.channel}>{item.channelName}</Text></View>
      <View style={styles.nowProgramme}><Text numberOfLines={1} style={styles.programmeTitle}>{item.title}</Text><View style={styles.track}><View style={[styles.progress, { width: `${progress * 100}%` }]} /></View></View>
      <Text style={styles.live}>{translate('● DIRECT', '● LIVE')}</Text>
    </FocusableCard>;
  }} windowSize={7} />;
}

function GuideGrid({ items, now, onSelect, windowEnd, windowStart }: { items: ChannelSchedule[]; now: number; onSelect: (item: GuideProgramme) => void; windowEnd: Date; windowStart: Date }) {
  return <View style={styles.gridViewport}><ScrollView horizontal showsHorizontalScrollIndicator>
    <View style={{ width: GRID_WIDTH }}>
      <TimelineHeader now={now} windowEnd={windowEnd} windowStart={windowStart} />
      <FlatList data={items} initialNumToRender={12} keyExtractor={(item) => item.channelId} maxToRenderPerBatch={12} removeClippedSubviews renderItem={({ item, index }) => <View style={styles.gridRow}>
        <View style={styles.channelCell}><Text numberOfLines={2} style={styles.gridChannel}>{item.channelName}</Text></View>
        <View style={styles.programmeLane}>{item.programmes.map((programme, programmeIndex) => {
          const layout = epgProgrammeLayout(programme.startsAt, programme.endsAt, windowStart, windowEnd);
          if (layout.width <= 0) return null;
          const live = isProgrammeLive(programme.startsAt, programme.endsAt, now);
          return <FocusableCard autoFocus={index === 0 && programmeIndex === 0} key={programme.id} onPress={() => onSelect(programme)} style={[styles.gridProgramme, live && styles.gridProgrammeLive, { left: layout.left, width: Math.max(72, layout.width - 4) }]}>
            <Text numberOfLines={1} style={styles.gridProgrammeTitle}>{programme.title}</Text><Text style={styles.gridProgrammeTime}>{formatTime(new Date(programme.startsAt))}–{formatTime(new Date(programme.endsAt))}</Text>
          </FocusableCard>;
        })}{now >= windowStart.getTime() && now < windowEnd.getTime() && <View pointerEvents="none" style={[styles.nowLine, { left: (now - windowStart.getTime()) / 60_000 * EPG_PIXELS_PER_MINUTE }]} />}</View>
      </View>} windowSize={7} />
    </View>
  </ScrollView></View>;
}

function TimelineHeader({ now, windowEnd, windowStart }: { now: number; windowEnd: Date; windowStart: Date }) {
  const slots = Array.from({ length: EPG_WINDOW_HOURS * 60 / EPG_SLOT_MINUTES }, (_, index) => new Date(windowStart.getTime() + index * EPG_SLOT_MINUTES * 60_000));
  return <View style={styles.timelineHeader}><View style={styles.timelineCorner}><Text style={styles.timelineCornerText}>{translate('CHAÎNES', 'CHANNELS')}</Text></View><View style={styles.timeline}>{slots.map((slot) => <View key={slot.toISOString()} style={styles.slot}><Text style={styles.slotText}>{formatTime(slot)}</Text></View>)}{now >= windowStart.getTime() && now < windowEnd.getTime() && <View style={[styles.nowHeaderLine, { left: (now - windowStart.getTime()) / 60_000 * EPG_PIXELS_PER_MINUTE }]} />}</View></View>;
}

function ProgrammeDetail({ item, onBack, onWatch }: { item: GuideProgramme; onBack: () => void; onWatch: () => void }) {
  return <Panel style={styles.detailPanel}><Text style={styles.detailEyebrow}>{item.channelName.toUpperCase()}</Text><Text style={styles.detailTitle}>{item.title}</Text><Text style={styles.detailSchedule}>{formatDay(new Date(item.startsAt))} · {formatTime(new Date(item.startsAt))}–{formatTime(new Date(item.endsAt))}</Text><Text style={styles.detailDescription}>{item.description?.trim() || translate('Aucune description fournie par le guide.', 'No description provided by the guide.')}</Text><View style={styles.detailActions}><ActionButton autoFocus icon="play" label={translate('Regarder la chaîne', 'Watch channel')} onPress={onWatch} /><ActionButton icon="arrow-back" label={translate('Retour à la grille', 'Back to schedule')} onPress={onBack} variant="secondary" /></View></Panel>;
}

function formatTime(date: Date) { return date.toLocaleTimeString(getAppLanguage() === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' }); }
function formatDay(date: Date) { return date.toLocaleDateString(getAppLanguage() === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' }); }

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.md, padding: spacing.xl },
  containerCompact: { padding: 12 },
  toolbar: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, navigation: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  nowRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, minHeight: 86 }, nowTime: { minWidth: 130, width: '24%' }, timeText: { color: colors.text, fontSize: 16, fontWeight: '800' }, channel: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  nowProgramme: { flex: 1 }, programmeTitle: { color: colors.text, fontSize: 18, fontWeight: '800' }, track: { backgroundColor: colors.border, borderRadius: radii.pill, height: 5, marginTop: spacing.sm, overflow: 'hidden' }, progress: { backgroundColor: colors.accentStrong, height: '100%' }, live: { color: colors.danger, fontSize: 12, fontWeight: '900' },
  gridViewport: { flex: 1, minHeight: 300 }, timelineHeader: { backgroundColor: colors.surface, flexDirection: 'row', height: 52 }, timelineCorner: { borderColor: colors.border, borderRightWidth: 1, justifyContent: 'center', paddingHorizontal: spacing.md, width: CHANNEL_WIDTH }, timelineCornerText: { color: colors.textMuted, fontSize: 12, fontWeight: '900' }, timeline: { flexDirection: 'row', position: 'relative', width: TIMELINE_WIDTH }, slot: { borderLeftColor: colors.border, borderLeftWidth: 1, justifyContent: 'center', paddingLeft: spacing.sm, width: EPG_SLOT_MINUTES * EPG_PIXELS_PER_MINUTE }, slotText: { color: colors.textMuted, fontSize: 13, fontWeight: '800' },
  gridRow: { borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', height: 82 }, channelCell: { backgroundColor: colors.surface, borderRightColor: colors.border, borderRightWidth: 1, justifyContent: 'center', paddingHorizontal: spacing.md, width: CHANNEL_WIDTH }, gridChannel: { color: colors.text, fontSize: 15, fontWeight: '800' }, programmeLane: { backgroundColor: colors.background, position: 'relative', width: TIMELINE_WIDTH }, gridProgramme: { bottom: 6, justifyContent: 'center', paddingHorizontal: spacing.sm, position: 'absolute', top: 6 }, gridProgrammeLive: { backgroundColor: '#2B234F', borderColor: colors.accentStrong }, gridProgrammeTitle: { color: colors.text, fontSize: 14, fontWeight: '800' }, gridProgrammeTime: { color: colors.textMuted, fontSize: 11, marginTop: 2 }, nowLine: { backgroundColor: colors.danger, bottom: 0, position: 'absolute', top: 0, width: 2 }, nowHeaderLine: { backgroundColor: colors.danger, bottom: 0, position: 'absolute', top: 0, width: 2 },
  slotNavigation: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  detailPanel: { alignSelf: 'center', gap: spacing.md, maxWidth: 900, width: '100%' }, detailEyebrow: { color: colors.accentStrong, fontSize: 13, fontWeight: '900', letterSpacing: 1.5 }, detailTitle: { color: colors.text, fontSize: 30, fontWeight: '900' }, detailSchedule: { color: colors.textMuted, fontSize: 16, fontWeight: '700' }, detailDescription: { color: colors.text, fontSize: 17, lineHeight: 26 }, detailActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
});
