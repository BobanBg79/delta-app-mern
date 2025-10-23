/**
 * Sorts and filters entities for dropdown display
 * Active entities appear first (alphabetically), inactive at bottom (alphabetically)
 *
 * @param {Array} entities - Array of entities (apartments, booking agents, etc.)
 * @param {string} activeFieldName - Name of the field that indicates if entity is active ('isActive' or 'active')
 * @returns {Array} Sorted entities
 */
export const sortEntitiesForDropdown = (entities, activeFieldName = 'active') => {
  return [...entities].sort((a, b) => {
    // Sort: active entities first, then inactive at bottom
    if (a[activeFieldName] === b[activeFieldName]) {
      // If same status, sort alphabetically by name
      return a.name.localeCompare(b.name);
    }
    // Active (true) comes before inactive (false)
    return a[activeFieldName] ? -1 : 1;
  });
};

/**
 * Determines if a dropdown option should be disabled
 * Inactive entities are disabled EXCEPT if they're the currently selected one
 *
 * @param {Object} entity - The entity object
 * @param {string} currentValue - Currently selected value (entity ID)
 * @param {string} activeFieldName - Name of the field that indicates if entity is active
 * @returns {boolean} Whether the option should be disabled
 */
export const shouldDisableOption = (entity, currentValue, activeFieldName = 'active') => {
  const isCurrentEntity = currentValue === entity._id;
  const isActive = entity[activeFieldName];
  return !isActive && !isCurrentEntity;
};

/**
 * Formats the display label for an entity in a dropdown
 * Adds "(Inactive)" suffix for inactive entities
 *
 * @param {string} name - Entity name
 * @param {boolean} isActive - Whether the entity is active
 * @returns {string} Formatted label
 */
export const formatDropdownLabel = (name, isActive) => {
  return `${name}${!isActive ? ' (Inactive)' : ''}`;
};
