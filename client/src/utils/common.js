export const nestFieldValue = (obj, arr, value) => {
  // Base case: if we've reached the end of the path
  if (arr.length === 1) {
    return {
      ...obj,
      [arr[0]]: value, // Direct assignment, no wrapping
    };
  }

  // Recursive case: we need to go deeper
  const [head, ...tail] = arr;
  return {
    ...obj,
    [head]: nestFieldValue(obj[head] || {}, tail, value),
  };
};
