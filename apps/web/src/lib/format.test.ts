import { describe, expect, it } from 'vitest';

import { formatPostmark } from './format';

const evening = new Date('2026-11-21T21:42:00.000Z');

describe('formatPostmark', () => {
  it('splits a timestamp into day and 24-hour time', () => {
    expect(formatPostmark(evening, { timeZone: 'UTC' })).toMatchObject({
      day: '21 NOV',
      time: '21:42',
    });
  });

  it('uses the given time zone, so the postmark matches the viewer’s clock', () => {
    expect(formatPostmark(evening, { timeZone: 'America/Bogota' })).toMatchObject({
      day: '21 NOV',
      time: '16:42',
    });
  });

  it('rolls the day over across midnight', () => {
    expect(formatPostmark(evening, { timeZone: 'Asia/Tokyo' })).toMatchObject({
      day: '22 NOV',
      time: '06:42',
    });
  });

  it('reads day first, like a real postmark, whatever the locale', () => {
    expect(formatPostmark(evening, { locale: 'en-US', timeZone: 'UTC' }).day).toBe('21 NOV');
  });

  it('takes the month name from the locale', () => {
    expect(formatPostmark(evening, { locale: 'es', timeZone: 'UTC' }).day).toBe('21 NOV');
    expect(formatPostmark(evening, { locale: 'de', timeZone: 'UTC' }).day).toBe('21 NOV');
    expect(
      formatPostmark(new Date('2026-03-05T12:00:00Z'), { locale: 'es', timeZone: 'UTC' }).day,
    ).toBe('5 MAR');
  });

  it('offers a full spoken label', () => {
    expect(formatPostmark(evening, { timeZone: 'UTC' }).label).toBe('November 21, 2026 at 9:42 PM');
  });
});
