/**
 * Get Bootstrap badge variant for cleaning status
 * @param {string} status - Cleaning status (scheduled, completed, cancelled)
 * @returns {JSX.Element} Badge component
 */
export const getCleaningStatusVariant = (status) => {
  const variants = {
    scheduled: 'primary',
    completed: 'success',
    cancelled: 'secondary',
  };
  return variants[status] || 'secondary';
};

/**
 * Cleaning status constants
 */
export const CLEANING_STATUSES = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};
