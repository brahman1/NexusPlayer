import type { ChannelCategory } from '../repositories/SQLiteChannelRepository';

export type ChannelCountryGroup = {
  country: string;
  count: number;
  categoryIds: string[];
};

export type ChannelThemeGroup = {
  theme: string;
  count: number;
  categoryIds: string[];
  countries: ChannelCountryGroup[];
};

function splitCategoryLabel(label: string) {
  const separator = label.lastIndexOf(' · ');
  if (separator < 0) return { theme: label, country: null };
  return { theme: label.slice(0, separator), country: label.slice(separator + 3) };
}

export function buildChannelCategoryHierarchy(categories: ChannelCategory[]) {
  const themes = new Map<string, {
    count: number;
    categoryIds: Set<string>;
    countries: Map<string, { count: number; categoryIds: Set<string> }>;
  }>();

  for (const category of categories) {
    const { theme, country } = splitCategoryLabel(category.displayName);
    const current = themes.get(theme) ?? { count: 0, categoryIds: new Set<string>(), countries: new Map() };
    current.count += category.channelCount;
    category.categoryIds.forEach((id) => current.categoryIds.add(id));
    if (country) {
      const countryGroup = current.countries.get(country) ?? { count: 0, categoryIds: new Set<string>() };
      countryGroup.count += category.channelCount;
      category.categoryIds.forEach((id) => countryGroup.categoryIds.add(id));
      current.countries.set(country, countryGroup);
    }
    themes.set(theme, current);
  }

  return [...themes.entries()].map(([theme, group]) => ({
    theme,
    count: group.count,
    categoryIds: [...group.categoryIds],
    countries: [...group.countries.entries()].map(([country, countryGroup]) => ({
      country,
      count: countryGroup.count,
      categoryIds: [...countryGroup.categoryIds],
    })),
  } satisfies ChannelThemeGroup));
}
