export const nestValue = (obj, arr, value) => {
  const nestedValue = arr.length !== 1;
  const objKey = arr[0];
  return {
    ...obj,
    [objKey]: nestedValue ? nestValue(obj[objKey], arr.slice(1), value) : value,
  };
};
