export const nestFieldValue = (obj, arr, value) => {
  const nestedValue = arr.length !== 1;
  const objKey = arr[0];

  return {
    ...obj,
    [objKey]: {
      ...obj[objKey],
      value: nestedValue ? nestFieldValue(obj[objKey], arr.slice(1), value) : value,
    },
  };
};
