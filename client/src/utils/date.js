const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const daysOfWeekShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const hoursInDay = 24;
const minutesInHour = 60;
const secondsInMinute = 60;
const millisecondsInSecond = 1000;

export const setReservationHours = (dateRangeArr) =>
  dateRangeArr.map((dateStr, index) => {
    const dateObj = new Date(dateStr);
    const hours = index ? 11 : 14; // because first item in array is checkin (from 14h) and the second is checkout (possible no later than 11h)
    dateObj.setHours(hours);
    dateObj.setMinutes(0);
    dateObj.setSeconds(0);
    dateObj.setMilliseconds(0);
    return dateObj.getTime();
  });

/**
 * @description set time for search based on plannedCHeckIn value: first item in array is startDate
 * for which time should be 00:00:00 and the second item is endDate which time is set to 23:59:59
 * so that we grab in the search all reservations which plannedCheckIn is in this range
 * @param {Array[String]} dateRangeArr
 * @returns timestamp
 */
export const setHoursForSearchReservation = (dateRangeArr) =>
  dateRangeArr.map((dateStr, index) => {
    const dateObj = new Date(dateStr);
    dateObj.setHours(index ? 23 : 0);
    dateObj.setMinutes(index ? 59 : 0);
    dateObj.setSeconds(index ? 59 : 0);
    dateObj.setMilliseconds(index ? 999 : 0);
    return dateObj.getTime();
  });

export const extractDateElements = (timestamp) => {
  const dateObject = new Date(timestamp);
  const dayIndex = dateObject.getDay();
  const monthIndex = dateObject.getMonth();
  return {
    dayOfTheWeek: daysOfWeek[dayIndex],
    dayOfWeekShort: daysOfWeekShort[dayIndex],
    dayOfTheMonth: dateObject.getDate(),
    monthName: months[monthIndex],
    monthNameShort: monthsShort[monthIndex],
    year: dateObject.getFullYear(),
  };
};

export const formatDateLong = (timestamp) => {
  const { dayOfTheWeek, dayOfTheMonth, monthName, year } = extractDateElements(timestamp);
  return `${dayOfTheWeek}, ${dayOfTheMonth}.${monthName}.${year}`;
};

export const formatDateDefault = (timestamp) => {
  const { dayOfTheMonth, monthNameShort, year } = extractDateElements(timestamp);
  return `${dayOfTheMonth} ${monthNameShort} ${year}`;
};

export const formatDayShort = (timestamp) => {
  const { dayOfWeekShort, dayOfTheMonth } = extractDateElements(timestamp);
  return `${dayOfWeekShort} </br> ${dayOfTheMonth}`;
};

/**
 * Format date-time string for display with date and time
 * @param {string|Date|number} dateValue - Date string, Date object, or timestamp
 * @returns {string} Formatted date-time string (e.g., "Jan 15, 2025, 02:30 PM")
 */
export const formatDateTime = (dateValue) => {
  if (!dateValue) return 'N/A';
  const date = new Date(dateValue);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getArrayOfConsecutiveDates = (startDate, numOfDays) => {
  startDate.setHours(0);
  startDate.setMinutes(0);
  startDate.setSeconds(0);
  startDate.setMilliseconds(0);
  const array = new Array(numOfDays).fill(null).map((_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    return date.getTime();
  });
  return array;
};

export const getDifferenceInDays = (timestamp1, timestamp2) => {
  const date1 = new Date(timestamp1).setHours(0, 0, 0, 0);
  const date2 = new Date(timestamp2).setHours(0, 0, 0, 0);
  const diffInMilliseconds = date2 - date1;
  const millisecondsInADay = hoursInDay * minutesInHour * secondsInMinute * millisecondsInSecond;
  return Math.round(diffInMilliseconds / millisecondsInADay);
};

export const isToday = (timestamp) => {
  const date = new Date(timestamp);
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

/**
 * Get current date-time in format YYYY-MM-DDTHH:MM for datetime-local input
 * @param {Date} date - Optional date object, defaults to now
 * @returns {string} Date-time string formatted for datetime-local input
 */
export const getCurrentDateTimeLocal = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};
