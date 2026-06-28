const Permission = require('../../models/Permission');

describe('Permission model', () => {
  describe('getAllPermissions', () => {
    const all = Permission.getAllPermissions();

    it('should include standard CRUD permissions', () => {
      expect(all).toContain('CAN_VIEW_USER');
      expect(all).toContain('CAN_DEACTIVATE_APARTMENT');
    });

    it('should include the unpaid reservations report permission', () => {
      expect(all).toContain('CAN_VIEW_UNPAID_RESERVATIONS_REPORT');
    });

    it('should include the change-password special permission', () => {
      expect(all).toContain('CAN_UPDATE_USER_PASSWORD');
    });

    it('should not contain duplicates', () => {
      expect(new Set(all).size).toBe(all.length);
    });
  });

  describe('name validation', () => {
    // Exercise the schema validator directly via validateSync
    const isValid = (name) => {
      const doc = new Permission({ name });
      const err = doc.validateSync();
      return !err || !err.errors.name;
    };

    it('should accept a report permission (CAN_VIEW_*_REPORT)', () => {
      expect(isValid('CAN_VIEW_UNPAID_RESERVATIONS_REPORT')).toBe(true);
    });

    it('should accept the change-password special permission', () => {
      expect(isValid('CAN_UPDATE_USER_PASSWORD')).toBe(true);
    });

    it('should accept standard and sensitive-data permissions', () => {
      expect(isValid('CAN_VIEW_USER')).toBe(true);
      expect(isValid('CAN_VIEW_CLEANING_SENSITIVE_DATA')).toBe(true);
    });

    it('should reject a DELETE permission', () => {
      expect(isValid('CAN_DELETE_USER')).toBe(false);
    });

    it('should reject a malformed report permission (missing _REPORT suffix)', () => {
      expect(isValid('CAN_VIEW_UNPAID_RESERVATIONS')).toBe(false);
    });
  });
});
