const bcrypt = require('bcryptjs');
const { hashPassword } = require('../../utils/passwordUtils');

// Mock bcrypt so we test OUR flow (salt -> hash -> return), not the library.
jest.mock('bcryptjs');

describe('passwordUtils.hashPassword', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should generate a cost-10 salt, hash the plain password with it, and return the hash', async () => {
    bcrypt.genSalt.mockResolvedValue('generated-salt');
    bcrypt.hash.mockResolvedValue('final-hash');

    const result = await hashPassword('PlainPass1!');

    // Salt is generated with the expected cost factor...
    expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
    // ...the plain password is hashed using that exact salt...
    expect(bcrypt.hash).toHaveBeenCalledWith('PlainPass1!', 'generated-salt');
    // ...and the hash is what gets returned to the caller.
    expect(result).toBe('final-hash');
  });

  it('should hash whatever plain password it receives (not a hard-coded value)', async () => {
    bcrypt.genSalt.mockResolvedValue('salt');
    bcrypt.hash.mockImplementation(async (plain) => `hashed:${plain}`);

    const first = await hashPassword('FirstPass1!');
    const second = await hashPassword('SecondPass2@');

    expect(first).toBe('hashed:FirstPass1!');
    expect(second).toBe('hashed:SecondPass2@');
  });
});
