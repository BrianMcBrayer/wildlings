import dayjs from 'dayjs';

export const nowIso = () => dayjs().toISOString();

export const nowMs = () => dayjs().valueOf();

export const currentYear = () => dayjs().year();

export const parseInstantMs = (value: string) => {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.valueOf() : null;
};

export const toIsoFromMs = (ms: number) => dayjs(ms).toISOString();

export const getYearWindowMs = (year: number) => {
  const start = dayjs(`${year}-01-01T00:00:00`);
  const end = start.add(1, 'year');
  return { startMs: start.valueOf(), endMs: end.valueOf() };
};

export const formatLocalDateTime = (value: string) => {
  const parsed = dayjs(value);
  if (!parsed.isValid()) {
    return value;
  }
  return parsed.format('MMM D, h:mm A');
};

export const toLocalInput = (value: string) => {
  const parsed = dayjs(value);
  if (!parsed.isValid()) {
    return '';
  }
  return parsed.format('YYYY-MM-DDTHH:mm');
};

export const fromLocalInput = (value: string) => {
  const parsed = dayjs(value);
  if (!parsed.isValid()) {
    return value;
  }
  return parsed.toISOString();
};
