export const setReservationHours = (dateRangeArr) => {
  const [checkInDateTimeStr, checkoutDateTimeStr] = dateRangeArr;
  return dateRangeArr.map((dateStr, index) => {
    const dateObj = new Date(dateStr);
    const hours = index ? 11 : 14;
    dateObj.setHours(hours);
    dateObj.setMinutes(0);
    dateObj.setSeconds(0);
    return dateObj.getTime();
  });
};
