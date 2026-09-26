export type ParsedXmltvProgramme = {
  channelTvgId: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
};

const entities: Record<string, string> = { amp: '&', apos: "'", gt: '>', lt: '<', quot: '"' };

function decodeXml(value: string) {
  return value.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (_, entity: string) => {
    if (entity.startsWith('#x')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return entities[entity] ?? `&${entity};`;
  }).replace(/<[^>]+>/g, '').trim();
}

export function parseXmltvDate(value: string) {
  const match = value.trim().match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*([+-]\d{4}|Z)?/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second = '00', zone = '+0000'] = match;
  const offset = zone === 'Z' ? 'Z' : `${zone.slice(0, 3)}:${zone.slice(3)}`;
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function parseXmltv(content: string) {
  const programmes: ParsedXmltvProgramme[] = [];
  const pattern = /<programme\b([^>]*)>([\s\S]*?)<\/programme>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content))) {
    const attributes = match[1] ?? '';
    const body = match[2] ?? '';
    const channel = attributes.match(/\bchannel\s*=\s*["']([^"']+)["']/i)?.[1]?.trim();
    const start = attributes.match(/\bstart\s*=\s*["']([^"']+)["']/i)?.[1];
    const stop = attributes.match(/\bstop\s*=\s*["']([^"']+)["']/i)?.[1];
    const title = body.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    const description = body.match(/<desc\b[^>]*>([\s\S]*?)<\/desc>/i)?.[1];
    const startsAt = start ? parseXmltvDate(start) : null;
    const endsAt = stop ? parseXmltvDate(stop) : null;
    if (!channel || !title || !startsAt || !endsAt || endsAt <= startsAt) continue;
    programmes.push({ channelTvgId: decodeXml(channel), title: decodeXml(title), description: description ? decodeXml(description) : null, startsAt, endsAt });
  }
  return programmes;
}
