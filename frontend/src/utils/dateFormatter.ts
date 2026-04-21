import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.locale('zh-cn');
dayjs.extend(relativeTime);
dayjs.extend(isToday);
dayjs.extend(isYesterday);
dayjs.extend(utc);
dayjs.extend(timezone);

const BEIJING_TIMEZONE = 'Asia/Shanghai';

export const toBeijingTime = (timeStr?: string | number | Date | null): dayjs.Dayjs | null => {
  if (!timeStr) return null;
  
  try {
    const date = dayjs(timeStr);
    if (!date || typeof date.isValid !== 'function' || !date.isValid()) return null;
    
    if (date.isUTC()) {
      return date.tz(BEIJING_TIMEZONE);
    }
    return date;
  } catch (e) {
    console.warn('Date parsing error:', e);
    return null;
  }
};

export const formatTimeSmart = (timeStr?: string | number | Date | null): string => {
  if (!timeStr) return '-';
  
  const date = toBeijingTime(timeStr);
  if (!date) return '-';

  try {
    const now = dayjs().tz(BEIJING_TIMEZONE);
    const diffHours = now.diff(date, 'hour');

    if (diffHours < 24) {
      return date.fromNow();
    }

    if (date.isYesterday()) {
      return `昨天 ${date.format('HH:mm')}`;
    }

    if (date.isSame(now, 'year')) {
      return date.format('MM-DD HH:mm');
    }

    return date.format('YYYY-MM-DD');
  } catch (e) {
    console.warn('Date formatting error:', e);
    return '-';
  }
};

export const formatTimeFull = (timeStr?: string | number | Date | null): string => {
  if (!timeStr) return '-';
  const date = toBeijingTime(timeStr);
  if (!date) return '-';
  return date.format('YYYY-MM-DD HH:mm:ss');
};

export const getCurrentBeijingTime = (): dayjs.Dayjs => {
  return dayjs().tz(BEIJING_TIMEZONE);
};

export const formatBeijingTime = (timeStr?: string | number | Date | null, format: string = 'YYYY-MM-DD HH:mm:ss'): string => {
  const date = toBeijingTime(timeStr);
  if (!date) return '-';
  return date.format(format);
};
