// Extrai lat/long de texto colado — "-15.7801, -47.9292", link do Google Maps, etc.
export function parsePastedCoordinates(text: string): { latitude: string; longitude: string } | null {
  const matches = text.match(/-?\d{1,3}\.\d+/g);
  if (!matches || matches.length < 2) return null;

  const lat = parseFloat(matches[0]);
  const lng = parseFloat(matches[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  return { latitude: matches[0], longitude: matches[1] };
}
