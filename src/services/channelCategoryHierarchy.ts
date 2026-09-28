import type { ChannelCategory } from '../repositories/SQLiteChannelRepository';
import { classifyContentText, contentCompetitionLabel, contentThemeLabel, contentTopicLabel, type ContentCompetitionId, type ContentThemeId, type ContentTopicId } from './contentTaxonomy';

export type ChannelCountryGroup = {
  country: string;
  count: number;
  categoryIds: string[];
};

export type ChannelTopicGroup = {
  id: ContentTopicId;
  topic: string;
  count: number;
  categoryIds: string[];
};
export type ChannelCompetitionGroup = { id: ContentCompetitionId; competition: string; count: number; categoryIds: string[] };

export type ChannelThemeGroup = {
  id: ContentThemeId;
  theme: string;
  count: number;
  categoryIds: string[];
  countries: ChannelCountryGroup[];
  topics: ChannelTopicGroup[];
  competitions: ChannelCompetitionGroup[];
};

function splitCategoryLabel(label: string) {
  const separator = label.lastIndexOf(' · ');
  if (separator < 0) return { country: null };
  return { country: label.slice(separator + 3) };
}

export function buildChannelCategoryHierarchy(categories: ChannelCategory[], language: 'fr' | 'en' = 'fr') {
  const themes = new Map<ContentThemeId, {
    count: number;
    categoryIds: Set<string>;
    countries: Map<string, { count: number; categoryIds: Set<string> }>;
    topics: Map<ContentTopicId, { count: number; categoryIds: Set<string> }>;
    competitions: Map<ContentCompetitionId, { count: number; categoryIds: Set<string> }>;
  }>();

  for (const category of categories) {
    const source = `${category.displayName} ${(category.rawNames ?? [category.name]).join(' ')}`;
    const classified = classifyContentText(source);
    const { country } = splitCategoryLabel(category.displayName);
    const current = themes.get(classified.theme) ?? { count: 0, categoryIds: new Set<string>(), countries: new Map(), topics: new Map(), competitions: new Map() };
    current.count += category.channelCount;
    category.categoryIds.forEach((id) => current.categoryIds.add(id));
    if (country) {
      const countryGroup = current.countries.get(country) ?? { count: 0, categoryIds: new Set<string>() };
      countryGroup.count += category.channelCount;
      category.categoryIds.forEach((id) => countryGroup.categoryIds.add(id));
      current.countries.set(country, countryGroup);
    }
    if (classified.topic) {
      const topicGroup = current.topics.get(classified.topic) ?? { count: 0, categoryIds: new Set<string>() };
      topicGroup.count += category.channelCount;
      category.categoryIds.forEach((id) => topicGroup.categoryIds.add(id));
      current.topics.set(classified.topic, topicGroup);
    }
    if (classified.competition) {
      const competitionGroup = current.competitions.get(classified.competition) ?? { count: 0, categoryIds: new Set<string>() };
      competitionGroup.count += category.channelCount;
      category.categoryIds.forEach((id) => competitionGroup.categoryIds.add(id));
      current.competitions.set(classified.competition, competitionGroup);
    }
    themes.set(classified.theme, current);
  }

  return [...themes.entries()].map(([id, group]) => ({
    id,
    theme: contentThemeLabel(id, language),
    count: group.count,
    categoryIds: [...group.categoryIds],
    countries: [...group.countries.entries()].map(([country, countryGroup]) => ({
      country,
      count: countryGroup.count,
      categoryIds: [...countryGroup.categoryIds],
    })),
    topics: [...group.topics.entries()].map(([topicId, topicGroup]) => ({
      id: topicId,
      topic: contentTopicLabel(topicId, language),
      count: topicGroup.count,
      categoryIds: [...topicGroup.categoryIds],
    })),
    competitions: [...group.competitions.entries()].map(([competitionId, competitionGroup]) => ({ id: competitionId, competition: contentCompetitionLabel(competitionId), count: competitionGroup.count, categoryIds: [...competitionGroup.categoryIds] })),
  } satisfies ChannelThemeGroup));
}
