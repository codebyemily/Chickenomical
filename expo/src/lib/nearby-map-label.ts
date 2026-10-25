export function nearbyMapLabel(
  radiusMiles: number,
  labels: string[],
  source: string,
  hasSeparateUserLocation = false,
  originLabel = 'You are the purple marker.',
) {
  const count = labels.length;
  const noun = count === 1 ? 'restaurant' : 'restaurants';
  const names = labels.join('. ');
  const locationLabel = hasSeparateUserLocation
    ? 'Your location is the blue marker; the selected search place is the purple marker.'
    : originLabel;
  return `Map of ${count} ${noun} within ${radiusMiles} miles.${names ? ` ${names}.` : ''} ${locationLabel} ${source}`;
}
