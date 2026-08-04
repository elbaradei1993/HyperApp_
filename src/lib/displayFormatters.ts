export const formatNumber = (value: number | string): string => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
};

export const formatTemperature = (temperature: number): string =>
  `${formatNumber(Math.round(temperature))}°`;

export const formatPercentage = (value: number): string =>
  `${formatNumber(Math.round(value))}%`;

export const formatDistance = (distance: number, unit: 'km' | 'm' = 'km'): string => {
  if (unit === 'm' && distance < 1000) {
    return `${formatNumber(Math.round(distance))}m`;
  }

  return `${formatNumber((distance / 1000).toFixed(1))}km`;
};
