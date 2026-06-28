const { requirePermission } = require('../../middleware/permission');
const Role = require('../../models/Role');
const { suppressConsoleOutput, restoreConsoleOutput } = require('../testUtils');

jest.mock('../../models/Role');

beforeAll(() => suppressConsoleOutput());
afterAll(() => restoreConsoleOutput());

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Mock Role.findOne({...}).populate('permissions', 'name')
const mockRoleWithPermissions = (permissionNames) => {
  Role.findOne.mockReturnValue({
    populate: jest.fn().mockResolvedValue(
      permissionNames === null
        ? null
        : { _id: 'role-id', permissions: permissionNames.map((name) => ({ name })) }
    ),
  });
};

describe('requirePermission middleware', () => {
  afterEach(() => jest.clearAllMocks());

  it('should call next() when the role has the required permission', async () => {
    mockRoleWithPermissions(['CAN_WRITE_OFF_RESERVATION', 'CAN_VIEW_RESERVATION']);
    const req = { user: { roleId: 'role-id' } };
    const res = makeRes();
    const next = jest.fn();

    await requirePermission('CAN_WRITE_OFF_RESERVATION')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 403 when a non-privileged role (e.g. cleaning lady) lacks the permission', async () => {
    // A CLEANING_LADY-type role: only its own permissions, no write-off
    mockRoleWithPermissions(['CAN_COMPLETE_CLEANING', 'CAN_VIEW_CLEANING']);
    const req = { user: { roleId: 'cleaning-role-id' } };
    const res = makeRes();
    const next = jest.fn();

    await requirePermission('CAN_WRITE_OFF_RESERVATION')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should return 401 when there is no authenticated user/role', async () => {
    const req = { user: null };
    const res = makeRes();
    const next = jest.fn();

    await requirePermission('CAN_WRITE_OFF_RESERVATION')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return 403 when the role is not found', async () => {
    mockRoleWithPermissions(null);
    const req = { user: { roleId: 'missing-role' } };
    const res = makeRes();
    const next = jest.fn();

    await requirePermission('CAN_WRITE_OFF_RESERVATION')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
