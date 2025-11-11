// tests/services/KontoService.test.js

const KontoService = require('../../services/accounting/KontoService');
const Konto = require('../../models/konto/Konto');
const Apartment = require('../../models/Apartment');
const User = require('../../models/User');

// Mock models
jest.mock('../../models/konto/Konto');
jest.mock('../../models/Apartment');
jest.mock('../../models/User');

describe('KontoService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getNextAvailableCode', () => {
    describe('Cash Register codes (10X format)', () => {
      it('should return "101" when no kontos exist with prefix "10"', async () => {
        Konto.find.mockReturnValue({
          session: jest.fn().mockResolvedValue([])
        });

        const result = await KontoService.getNextAvailableCode('10');

        expect(result).toBe('101');
        expect(Konto.find).toHaveBeenCalledWith({
          code: expect.any(RegExp)
        });
      });

      it('should return "102" when "101" exists', async () => {
        Konto.find.mockReturnValue({
          session: jest.fn().mockResolvedValue([
            { code: '101' }
          ])
        });

        const result = await KontoService.getNextAvailableCode('10');

        expect(result).toBe('102');
      });

      it('should return "105" when codes 101-104 exist', async () => {
        Konto.find.mockReturnValue({
          session: jest.fn().mockResolvedValue([
            { code: '101' },
            { code: '102' },
            { code: '103' },
            { code: '104' }
          ])
        });

        const result = await KontoService.getNextAvailableCode('10');

        expect(result).toBe('105');
      });

      it('should handle non-sequential codes and return next after max', async () => {
        Konto.find.mockReturnValue({
          session: jest.fn().mockResolvedValue([
            { code: '101' },
            { code: '103' },
            { code: '107' }
          ])
        });

        const result = await KontoService.getNextAvailableCode('10');

        expect(result).toBe('108'); // Next after max (107)
      });
    });

    describe('Apartment Revenue codes (601-XX format)', () => {
      it('should return "601-1" when no kontos exist with prefix "601-"', async () => {
        Konto.find.mockReturnValue({
          session: jest.fn().mockResolvedValue([])
        });

        const result = await KontoService.getNextAvailableCode('601-');

        expect(result).toBe('601-1');
      });

      it('should return "601-2" when "601-01" exists', async () => {
        Konto.find.mockReturnValue({
          session: jest.fn().mockResolvedValue([
            { code: '601-01' }
          ])
        });

        const result = await KontoService.getNextAvailableCode('601-');

        expect(result).toBe('601-2');
      });

      it('should return "601-19" when codes 601-01 to 601-18 exist', async () => {
        const mockKontos = Array.from({ length: 18 }, (_, i) => ({
          code: `601-${String(i + 1).padStart(2, '0')}`
        }));

        Konto.find.mockReturnValue({
          session: jest.fn().mockResolvedValue(mockKontos)
        });

        const result = await KontoService.getNextAvailableCode('601-');

        expect(result).toBe('601-19');
      });
    });

    describe('Apartment Rent codes (701-XX format)', () => {
      it('should return "701-1" when no kontos exist with prefix "701-"', async () => {
        Konto.find.mockReturnValue({
          session: jest.fn().mockResolvedValue([])
        });

        const result = await KontoService.getNextAvailableCode('701-');

        expect(result).toBe('701-1');
      });

      it('should return "701-15" when codes 701-01 to 701-14 exist', async () => {
        const mockKontos = Array.from({ length: 14 }, (_, i) => ({
          code: `701-${String(i + 1).padStart(2, '0')}`
        }));

        Konto.find.mockReturnValue({
          session: jest.fn().mockResolvedValue(mockKontos)
        });

        const result = await KontoService.getNextAvailableCode('701-');

        expect(result).toBe('701-15');
      });
    });

    describe('Session handling', () => {
      it('should pass session to Konto.find when provided', async () => {
        const mockSession = { id: 'test-session' };
        const mockFind = jest.fn().mockReturnValue({
          session: jest.fn().mockResolvedValue([])
        });
        Konto.find = mockFind;

        await KontoService.getNextAvailableCode('10', mockSession);

        expect(mockFind).toHaveBeenCalledWith({
          code: expect.any(RegExp)
        });
      });
    });
  });

  describe('createKontosForApartment', () => {
    const mockApartmentId = '507f1f77bcf86cd799439011';
    const mockApartmentName = 'Test Apartment';

    describe('Error scenarios', () => {
      it('should throw error when apartment does not exist in database', async () => {
        // Mock Apartment.findById to return null (apartment not found)
        Apartment.findById = jest.fn().mockReturnValue({
          session: jest.fn().mockResolvedValue(null)
        });

        await expect(
          KontoService.createKontosForApartment(mockApartmentId, mockApartmentName)
        ).rejects.toThrow('Apartment not found');

        expect(Apartment.findById).toHaveBeenCalledWith(mockApartmentId);
      });

      it('should throw error when kontos already exist for apartment', async () => {
        // Mock Apartment.findById to return apartment
        const mockApartment = { _id: mockApartmentId, name: mockApartmentName };
        Apartment.findById = jest.fn().mockReturnValue({
          session: jest.fn().mockResolvedValue(mockApartment)
        });

        // Mock Konto.find to return existing kontos
        const existingKontos = [
          { code: '601-01', apartmentId: mockApartmentId },
          { code: '701-01', apartmentId: mockApartmentId }
        ];
        Konto.find = jest.fn().mockReturnValue({
          session: jest.fn().mockResolvedValue(existingKontos)
        });

        await expect(
          KontoService.createKontosForApartment(mockApartmentId, mockApartmentName)
        ).rejects.toThrow(`Apartment ${mockApartmentName} already has 2 konto(s)`);

        expect(Konto.find).toHaveBeenCalledWith({ apartmentId: mockApartmentId });
      });
    });

    describe('Success scenario', () => {
      it('should create revenue and rent kontos with correct data', async () => {
        // Mock Apartment.findById to return apartment
        const mockApartment = { _id: mockApartmentId, name: mockApartmentName };
        Apartment.findById = jest.fn().mockReturnValue({
          session: jest.fn().mockResolvedValue(mockApartment)
        });

        // Mock Konto.find for checking existing kontos (none exist)
        Konto.find = jest.fn().mockReturnValue({
          session: jest.fn().mockResolvedValue([])
        });

        // Mock getNextAvailableCode calls (indirectly via Konto.find)
        // First call checks existing kontos for apartment
        // Second call for revenue code '601-'
        // Third call for rent code '701-'
        Konto.find = jest.fn()
          .mockReturnValueOnce({
            session: jest.fn().mockResolvedValue([]) // No existing kontos for apartment
          })
          .mockReturnValueOnce({
            session: jest.fn().mockResolvedValue([]) // No existing 601- codes
          })
          .mockReturnValueOnce({
            session: jest.fn().mockResolvedValue([]) // No existing 701- codes
          });

        // Mock Konto.create to return created kontos
        // Now called twice (once for revenue, once for rent)
        const mockRevenueKonto = {
          code: '601-1',
          name: `Accommodation Revenue - ${mockApartmentName}`,
          type: 'revenue',
          apartmentId: mockApartmentId,
          apartmentName: mockApartmentName,
          description: `Revenue from accommodation in apartment ${mockApartmentName}`,
          currentBalance: 0,
          isActive: true
        };

        const mockRentKonto = {
          code: '701-1',
          name: `Rent to Owner - ${mockApartmentName}`,
          type: 'expense',
          apartmentId: mockApartmentId,
          apartmentName: mockApartmentName,
          description: `Monthly rent to owner of apartment ${mockApartmentName}`,
          currentBalance: 0,
          isActive: true
        };

        Konto.create = jest.fn()
          .mockResolvedValueOnce([mockRevenueKonto])  // First call: revenue konto
          .mockResolvedValueOnce([mockRentKonto]);    // Second call: rent konto

        // Execute
        const result = await KontoService.createKontosForApartment(mockApartmentId, mockApartmentName);

        // Assertions
        expect(result).toEqual({
          revenueKonto: mockRevenueKonto,
          rentKonto: mockRentKonto
        });

        // Verify Konto.create was called twice with correct data
        expect(Konto.create).toHaveBeenCalledTimes(2);

        // First call for revenue konto
        expect(Konto.create).toHaveBeenNthCalledWith(
          1,
          [
            {
              code: '601-1',
              name: `Accommodation Revenue - ${mockApartmentName}`,
              type: 'revenue',
              apartmentId: mockApartmentId,
              apartmentName: mockApartmentName,
              description: `Revenue from accommodation in apartment ${mockApartmentName}`,
              currentBalance: 0,
              isActive: true
            }
          ],
          { session: null }
        );

        // Second call for rent konto
        expect(Konto.create).toHaveBeenNthCalledWith(
          2,
          [
            {
              code: '701-1',
              name: `Rent to Owner - ${mockApartmentName}`,
              type: 'expense',
              apartmentId: mockApartmentId,
              apartmentName: mockApartmentName,
              description: `Monthly rent to owner of apartment ${mockApartmentName}`,
              currentBalance: 0,
              isActive: true
            }
          ],
          { session: null }
        );
      });

      it('should create kontos with sequential codes when others exist', async () => {
        // Mock Apartment.findById to return apartment
        const mockApartment = { _id: mockApartmentId, name: mockApartmentName };
        Apartment.findById = jest.fn().mockReturnValue({
          session: jest.fn().mockResolvedValue(mockApartment)
        });

        // Mock Konto.find for different scenarios
        Konto.find = jest.fn()
          .mockReturnValueOnce({
            session: jest.fn().mockResolvedValue([]) // No existing kontos for this apartment
          })
          .mockReturnValueOnce({
            // Existing revenue codes (601-01, 601-02, 601-03)
            session: jest.fn().mockResolvedValue([
              { code: '601-01' },
              { code: '601-02' },
              { code: '601-03' }
            ])
          })
          .mockReturnValueOnce({
            // Existing rent codes (701-01, 701-02)
            session: jest.fn().mockResolvedValue([
              { code: '701-01' },
              { code: '701-02' }
            ])
          });

        // Mock Konto.create - called twice (once for revenue, once for rent)
        const mockRevenueKonto = { code: '601-4', name: `Accommodation Revenue - ${mockApartmentName}` };
        const mockRentKonto = { code: '701-3', name: `Rent to Owner - ${mockApartmentName}` };
        Konto.create = jest.fn()
          .mockResolvedValueOnce([mockRevenueKonto])  // First call: revenue konto
          .mockResolvedValueOnce([mockRentKonto]);    // Second call: rent konto

        // Execute
        const result = await KontoService.createKontosForApartment(mockApartmentId, mockApartmentName);

        // Assertions
        expect(result.revenueKonto.code).toBe('601-4');
        expect(result.rentKonto.code).toBe('701-3');
      });
    });
  });

  describe('syncApartmentKontos', () => {
    const Apartment = require('../../models/Apartment');

    beforeEach(() => {
      // Mock Apartment model
      jest.mock('../../models/Apartment');
    });

    describe('All kontos exist - nothing to sync', () => {
      it('should return syncedCount=0 when all apartments have both kontos', async () => {
        // Mock apartments
        const mockApartments = [
          { _id: '507f1f77bcf86cd799439011', name: 'Apartment A' },
          { _id: '507f1f77bcf86cd799439012', name: 'Apartment B' }
        ];

        Apartment.find = jest.fn().mockResolvedValue(mockApartments);

        // Mock Konto.findOne to always return existing kontos
        Konto.findOne = jest.fn()
          // Apartment A - revenue exists
          .mockResolvedValueOnce({ code: '601-01', name: 'Accommodation Revenue - Apartment A' })
          // Apartment A - rent exists
          .mockResolvedValueOnce({ code: '701-01', name: 'Rent to Owner - Apartment A' })
          // Apartment B - revenue exists
          .mockResolvedValueOnce({ code: '601-02', name: 'Accommodation Revenue - Apartment B' })
          // Apartment B - rent exists
          .mockResolvedValueOnce({ code: '701-02', name: 'Rent to Owner - Apartment B' });

        // Execute
        const result = await KontoService.syncApartmentKontos();

        // Assertions
        expect(result.syncedCount).toBe(0);
        expect(result.errors).toEqual([]);
        expect(Apartment.find).toHaveBeenCalledWith({});
        expect(Konto.findOne).toHaveBeenCalledTimes(4); // 2 apartments × 2 kontos each
      });
    });

    describe('Missing kontos - needs sync', () => {
      it('should create missing revenue konto only', async () => {
        const mockApartment = { _id: '507f1f77bcf86cd799439011', name: 'Test Apartment' };
        Apartment.find = jest.fn().mockResolvedValue([mockApartment]);

        // Mock Konto.findOne
        Konto.findOne = jest.fn()
          .mockResolvedValueOnce(null)  // Revenue doesn't exist
          .mockResolvedValueOnce({ code: '701-01' });  // Rent exists

        // Mock getNextAvailableCode (via Konto.find)
        Konto.find = jest.fn().mockReturnValue({
          session: jest.fn().mockResolvedValue([])
        });

        // Mock Konto.create for revenue
        const mockRevenueKonto = {
          code: '601-1',
          name: 'Accommodation Revenue - Test Apartment',
          type: 'revenue'
        };
        Konto.create = jest.fn().mockResolvedValue([mockRevenueKonto]);

        // Execute
        const result = await KontoService.syncApartmentKontos();

        // Assertions
        expect(result.syncedCount).toBe(1);
        expect(result.errors).toEqual([]);
        expect(Konto.create).toHaveBeenCalledTimes(1);
      });

      it('should create missing rent konto only', async () => {
        const mockApartment = { _id: '507f1f77bcf86cd799439011', name: 'Test Apartment' };
        Apartment.find = jest.fn().mockResolvedValue([mockApartment]);

        // Mock Konto.findOne
        Konto.findOne = jest.fn()
          .mockResolvedValueOnce({ code: '601-01' })  // Revenue exists
          .mockResolvedValueOnce(null);  // Rent doesn't exist

        // Mock getNextAvailableCode (via Konto.find)
        Konto.find = jest.fn().mockReturnValue({
          session: jest.fn().mockResolvedValue([])
        });

        // Mock Konto.create for rent
        const mockRentKonto = {
          code: '701-1',
          name: 'Rent to Owner - Test Apartment',
          type: 'expense'
        };
        Konto.create = jest.fn().mockResolvedValue([mockRentKonto]);

        // Execute
        const result = await KontoService.syncApartmentKontos();

        // Assertions
        expect(result.syncedCount).toBe(1);
        expect(result.errors).toEqual([]);
        expect(Konto.create).toHaveBeenCalledTimes(1);
      });

      it('should create both kontos when apartment has none', async () => {
        const mockApartment = { _id: '507f1f77bcf86cd799439011', name: 'New Apartment' };
        Apartment.find = jest.fn().mockResolvedValue([mockApartment]);

        // Mock Konto.findOne - both return null
        Konto.findOne = jest.fn()
          .mockResolvedValueOnce(null)  // Revenue doesn't exist
          .mockResolvedValueOnce(null);  // Rent doesn't exist

        // Mock getNextAvailableCode (via Konto.find)
        Konto.find = jest.fn()
          .mockReturnValueOnce({
            session: jest.fn().mockResolvedValue([])  // For revenue code
          })
          .mockReturnValueOnce({
            session: jest.fn().mockResolvedValue([])  // For rent code
          });

        // Mock Konto.create
        const mockRevenueKonto = { code: '601-1', name: 'Accommodation Revenue - New Apartment' };
        const mockRentKonto = { code: '701-1', name: 'Rent to Owner - New Apartment' };
        Konto.create = jest.fn()
          .mockResolvedValueOnce([mockRevenueKonto])
          .mockResolvedValueOnce([mockRentKonto]);

        // Execute
        const result = await KontoService.syncApartmentKontos();

        // Assertions
        expect(result.syncedCount).toBe(2);
        expect(result.errors).toEqual([]);
        expect(Konto.create).toHaveBeenCalledTimes(2);
      });

      it('should sync multiple apartments with missing kontos', async () => {
        const mockApartments = [
          { _id: '507f1f77bcf86cd799439011', name: 'Apartment A' },
          { _id: '507f1f77bcf86cd799439012', name: 'Apartment B' },
          { _id: '507f1f77bcf86cd799439013', name: 'Apartment C' }
        ];
        Apartment.find = jest.fn().mockResolvedValue(mockApartments);

        // Mock Konto.findOne
        Konto.findOne = jest.fn()
          // Apartment A - both exist
          .mockResolvedValueOnce({ code: '601-01' })
          .mockResolvedValueOnce({ code: '701-01' })
          // Apartment B - revenue missing
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ code: '701-02' })
          // Apartment C - both missing
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null);

        // Mock getNextAvailableCode
        Konto.find = jest.fn()
          .mockReturnValueOnce({ session: jest.fn().mockResolvedValue([]) })  // B revenue
          .mockReturnValueOnce({ session: jest.fn().mockResolvedValue([]) })  // C revenue
          .mockReturnValueOnce({ session: jest.fn().mockResolvedValue([]) }); // C rent

        // Mock Konto.create
        Konto.create = jest.fn()
          .mockResolvedValueOnce([{ code: '601-2' }])  // B revenue
          .mockResolvedValueOnce([{ code: '601-3' }])  // C revenue
          .mockResolvedValueOnce([{ code: '701-3' }]); // C rent

        // Execute
        const result = await KontoService.syncApartmentKontos();

        // Assertions
        expect(result.syncedCount).toBe(3);  // 1 from B + 2 from C
        expect(result.errors).toEqual([]);
        expect(Konto.create).toHaveBeenCalledTimes(3);
      });
    });

    describe('Error handling - non-blocking', () => {
      it('should log error but continue when creating revenue konto fails', async () => {
        const mockApartment = { _id: '507f1f77bcf86cd799439011', name: 'Test Apartment' };
        Apartment.find = jest.fn().mockResolvedValue([mockApartment]);

        // Mock Konto.findOne - both missing
        Konto.findOne = jest.fn()
          .mockResolvedValueOnce(null)  // Revenue missing
          .mockResolvedValueOnce(null);  // Rent missing

        // Mock getNextAvailableCode
        Konto.find = jest.fn()
          .mockReturnValueOnce({ session: jest.fn().mockResolvedValue([]) })  // Revenue
          .mockReturnValueOnce({ session: jest.fn().mockResolvedValue([]) }); // Rent

        // Mock Konto.create - revenue fails, rent succeeds
        Konto.create = jest.fn()
          .mockRejectedValueOnce(new Error('Database connection lost'))  // Revenue fails
          .mockResolvedValueOnce([{ code: '701-1', name: 'Rent to Owner - Test Apartment' }]);  // Rent succeeds

        // Execute
        const result = await KontoService.syncApartmentKontos();

        // Assertions
        expect(result.syncedCount).toBe(1);  // Only rent was created
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('Failed to create Revenue konto');
        expect(result.errors[0]).toContain('Database connection lost');
      });

      it('should log error but continue when creating rent konto fails', async () => {
        const mockApartment = { _id: '507f1f77bcf86cd799439011', name: 'Test Apartment' };
        Apartment.find = jest.fn().mockResolvedValue([mockApartment]);

        // Mock Konto.findOne - both missing
        Konto.findOne = jest.fn()
          .mockResolvedValueOnce(null)  // Revenue missing
          .mockResolvedValueOnce(null);  // Rent missing

        // Mock getNextAvailableCode
        Konto.find = jest.fn()
          .mockReturnValueOnce({ session: jest.fn().mockResolvedValue([]) })  // Revenue
          .mockReturnValueOnce({ session: jest.fn().mockResolvedValue([]) }); // Rent

        // Mock Konto.create - revenue succeeds, rent fails
        Konto.create = jest.fn()
          .mockResolvedValueOnce([{ code: '601-1', name: 'Accommodation Revenue - Test Apartment' }])  // Revenue succeeds
          .mockRejectedValueOnce(new Error('Duplicate key error'));  // Rent fails

        // Execute
        const result = await KontoService.syncApartmentKontos();

        // Assertions
        expect(result.syncedCount).toBe(1);  // Only revenue was created
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('Failed to create Rent konto');
        expect(result.errors[0]).toContain('Duplicate key error');
      });

      it('should handle errors for specific apartment and continue with others', async () => {
        const mockApartments = [
          { _id: '507f1f77bcf86cd799439011', name: 'Good Apartment' },
          { _id: '507f1f77bcf86cd799439012', name: 'Bad Apartment' },
          { _id: '507f1f77bcf86cd799439013', name: 'Another Good Apartment' }
        ];
        Apartment.find = jest.fn().mockResolvedValue(mockApartments);

        // Mock Konto.findOne
        Konto.findOne = jest.fn()
          // Good Apartment - revenue missing
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ code: '701-01' })
          // Bad Apartment - throws error
          .mockRejectedValueOnce(new Error('Apartment processing error'))
          // Another Good Apartment - rent missing
          .mockResolvedValueOnce({ code: '601-03' })
          .mockResolvedValueOnce(null);

        // Mock getNextAvailableCode
        Konto.find = jest.fn()
          .mockReturnValue({ session: jest.fn().mockResolvedValue([]) });

        // Mock Konto.create
        Konto.create = jest.fn()
          .mockResolvedValueOnce([{ code: '601-1' }])  // Good Apartment revenue
          .mockResolvedValueOnce([{ code: '701-3' }]); // Another Good Apartment rent

        // Execute
        const result = await KontoService.syncApartmentKontos();

        // Assertions
        expect(result.syncedCount).toBe(2);  // 1 from Good + 1 from Another Good
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('Error syncing kontos for apartment Bad Apartment');
        expect(result.errors[0]).toContain('Apartment processing error');
      });
    });

    describe('No apartments in database', () => {
      it('should handle empty apartment list gracefully', async () => {
        Apartment.find = jest.fn().mockResolvedValue([]);

        // Execute
        const result = await KontoService.syncApartmentKontos();

        // Assertions
        expect(result.syncedCount).toBe(0);
        expect(result.errors).toEqual([]);
        expect(Konto.findOne).not.toHaveBeenCalled();
        expect(Konto.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('createKontosForCleaningLady', () => {
    const mockUserId = '507f1f77bcf86cd799439020';
    const mockFname = 'Jane';
    const mockLname = 'Doe';
    const mockUserName = 'Jane Doe';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('Error scenarios', () => {
      it('should throw error when user does not exist', async () => {
        // Mock User.findById to return null
        User.findById = jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            session: jest.fn().mockResolvedValue(null)
          })
        });

        // Execute and Assert
        await expect(
          KontoService.createKontosForCleaningLady(mockUserId, mockFname, mockLname)
        ).rejects.toThrow('User not found');
      });

      it('should throw error when user is not a CLEANING_LADY', async () => {
        // Mock User.findById to return a non-cleaning lady user
        const mockUser = {
          _id: mockUserId,
          fname: mockFname,
          lname: mockLname,
          role: { name: 'HOST' }
        };

        User.findById = jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            session: jest.fn().mockResolvedValue(mockUser)
          })
        });

        // Execute and Assert
        await expect(
          KontoService.createKontosForCleaningLady(mockUserId, mockFname, mockLname)
        ).rejects.toThrow('is not a cleaning lady');
      });

      it('should throw error when kontos already exist for cleaning lady', async () => {
        // Mock User.findById to return a cleaning lady
        const mockUser = {
          _id: mockUserId,
          fname: mockFname,
          lname: mockLname,
          role: { name: 'CLEANING_LADY' }
        };

        User.findById = jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            session: jest.fn().mockResolvedValue(mockUser)
          })
        });

        // Mock Konto.find to return existing kontos
        Konto.find = jest.fn().mockReturnValue({
          session: jest.fn().mockResolvedValue([
            { code: '201', name: 'Payables to Cleaner - Jane Doe' },
            { code: '751', name: 'Net Salary - Jane Doe' }
          ])
        });

        // Execute and Assert
        await expect(
          KontoService.createKontosForCleaningLady(mockUserId, mockFname, mockLname)
        ).rejects.toThrow('already has 2 konto(s)');
      });
    });

    describe('Success scenario', () => {
      it('should create payables and net salary kontos with correct data', async () => {
        // Mock User.findById to return a cleaning lady
        const mockUser = {
          _id: mockUserId,
          fname: mockFname,
          lname: mockLname,
          role: { name: 'CLEANING_LADY' }
        };

        User.findById = jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            session: jest.fn().mockResolvedValue(mockUser)
          })
        });

        // Mock Konto.find for checking existing kontos (none exist)
        // Also for getNextAvailableCode calls
        Konto.find = jest.fn()
          .mockReturnValueOnce({
            session: jest.fn().mockResolvedValue([]) // No existing kontos
          })
          .mockReturnValueOnce({
            session: jest.fn().mockResolvedValue([]) // No existing 20X codes
          })
          .mockReturnValueOnce({
            session: jest.fn().mockResolvedValue([]) // No existing 75X codes
          });

        // Mock Konto.create
        const mockPayablesKonto = {
          code: '201',
          name: `Payables to Cleaner - ${mockUserName}`,
          type: 'liability',
          employeeId: mockUserId,
          employeeName: mockUserName,
          description: `Payables to cleaning lady ${mockUserName}`,
          currentBalance: 0,
          isActive: true
        };

        const mockNetSalaryKonto = {
          code: '751',
          name: `Net Salary - ${mockUserName}`,
          type: 'expense',
          employeeId: mockUserId,
          employeeName: mockUserName,
          description: `Net salary expense for cleaning lady ${mockUserName}`,
          currentBalance: 0,
          isActive: true
        };

        Konto.create = jest.fn()
          .mockResolvedValueOnce([mockPayablesKonto])  // First call: payables
          .mockResolvedValueOnce([mockNetSalaryKonto]); // Second call: net salary

        // Execute
        const result = await KontoService.createKontosForCleaningLady(mockUserId, mockFname, mockLname);

        // Assertions
        expect(result).toEqual({
          payablesKonto: mockPayablesKonto,
          netSalaryKonto: mockNetSalaryKonto
        });

        // Verify Konto.create was called twice with correct data
        expect(Konto.create).toHaveBeenCalledTimes(2);

        // First call for payables konto
        expect(Konto.create).toHaveBeenNthCalledWith(
          1,
          [
            {
              code: '201',
              name: `Payables to Cleaner - ${mockUserName}`,
              type: 'liability',
              employeeId: mockUserId,
              employeeName: mockUserName,
              description: `Payables to cleaning lady ${mockUserName}`,
              currentBalance: 0,
              isActive: true
            }
          ],
          { session: null }
        );

        // Second call for net salary konto
        expect(Konto.create).toHaveBeenNthCalledWith(
          2,
          [
            {
              code: '751',
              name: `Net Salary - ${mockUserName}`,
              type: 'expense',
              employeeId: mockUserId,
              employeeName: mockUserName,
              description: `Net salary expense for cleaning lady ${mockUserName}`,
              currentBalance: 0,
              isActive: true
            }
          ],
          { session: null }
        );
      });
    });
  });

  describe('syncUserKontos', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('All kontos exist - nothing to sync', () => {
      it('should return syncedCount=0 when all users have required kontos', async () => {
        // Mock users: 1 OWNER (needs Cash Register), 1 CLEANING_LADY (needs all 3)
        const mockUsers = [
          { _id: 'user1', fname: 'John', lname: 'Owner', role: { name: 'OWNER' } },
          { _id: 'user2', fname: 'Jane', lname: 'Cleaner', role: { name: 'CLEANING_LADY' } }
        ];

        User.find = jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockUsers)
        });

        // Mock Cash Register checks - both exist
        Konto.findOne = jest.fn()
          // User 1 (OWNER) - Cash Register exists
          .mockResolvedValueOnce({ code: '101', name: 'Cash Register - John Owner' })
          // User 2 (CLEANING_LADY) - Cash Register exists
          .mockResolvedValueOnce({ code: '102', name: 'Cash Register - Jane Cleaner' })
          // User 2 - Payables exists
          .mockResolvedValueOnce({ code: '201', name: 'Payables to Cleaner - Jane Cleaner' })
          // User 2 - Net Salary exists
          .mockResolvedValueOnce({ code: '751', name: 'Net Salary - Jane Cleaner' });

        // Execute
        const result = await KontoService.syncUserKontos();

        // Assertions
        expect(result.syncedCount).toBe(0);
        expect(result.errors).toEqual([]);
        expect(Konto.create).not.toHaveBeenCalled();
      });
    });

    describe('Missing CLEANING_LADY kontos', () => {
      it('should create all 3 kontos when CLEANING_LADY has none', async () => {
        const mockUsers = [
          { _id: 'user1', fname: 'Jane', lname: 'Cleaner', role: { name: 'CLEANING_LADY' } }
        ];

        // User.find is called TWICE - once for Cash Registers, once for CLEANING_LADY
        User.find = jest.fn().mockReturnValue({
          populate: jest.fn()
            .mockResolvedValueOnce(mockUsers)  // For Cash Registers sync
            .mockResolvedValueOnce(mockUsers)  // For CLEANING_LADY sync
        });

        // Mock User.findById for createCashRegisterForUser
        User.findById = jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            session: jest.fn().mockResolvedValue(mockUsers[0])
          })
        });

        // Mock Konto.findOne
        // First call: _findCashRegisterForUser (via _syncCashRegisters) - returns null
        // Second call: createCashRegisterForUser checks if Cash Register exists - needs .session()
        // Third call: _findPayablesKontoForUser (via _syncCleaningLadyKontos) - returns null
        // Fourth call: _findNetSalaryKontoForUser (via _syncCleaningLadyKontos) - returns null
        Konto.findOne = jest.fn()
          .mockResolvedValueOnce(null)  // _findCashRegisterForUser
          .mockReturnValueOnce({ session: jest.fn().mockResolvedValue(null) })  // createCashRegisterForUser check
          .mockResolvedValueOnce(null)  // _findPayablesKontoForUser
          .mockResolvedValueOnce(null); // _findNetSalaryKontoForUser

        // Mock getNextAvailableCode
        Konto.find = jest.fn()
          .mockReturnValueOnce({ session: jest.fn().mockResolvedValue([]) })  // For Cash Register
          .mockReturnValueOnce({ session: jest.fn().mockResolvedValue([]) })  // For Payables
          .mockReturnValueOnce({ session: jest.fn().mockResolvedValue([]) }); // For Net Salary

        // Mock Konto.create
        const mockCashRegister = { code: '101', name: 'Cash Register - Jane Cleaner' };
        const mockPayables = { code: '201', name: 'Payables to Cleaner - Jane Cleaner' };
        const mockNetSalary = { code: '751', name: 'Net Salary - Jane Cleaner' };
        Konto.create = jest.fn()
          .mockResolvedValueOnce([mockCashRegister])
          .mockResolvedValueOnce([mockPayables])
          .mockResolvedValueOnce([mockNetSalary]);

        // Execute
        const result = await KontoService.syncUserKontos();

        // Assertions
        expect(result.syncedCount).toBe(3);
        expect(result.errors).toEqual([]);
        expect(Konto.create).toHaveBeenCalledTimes(3);
      });

      it('should create only missing Payables with correct data when other kontos exist', async () => {
        const mockUserId = 'user1';
        const mockUsers = [
          { _id: mockUserId, fname: 'Jane', lname: 'Cleaner', role: { name: 'CLEANING_LADY' } }
        ];

        // User.find is called TWICE
        User.find = jest.fn().mockReturnValue({
          populate: jest.fn()
            .mockResolvedValueOnce(mockUsers)  // For Cash Registers sync
            .mockResolvedValueOnce(mockUsers)  // For CLEANING_LADY sync
        });

        // Mock Konto.findOne
        Konto.findOne = jest.fn()
          .mockResolvedValueOnce({ code: '101' })  // Cash Register exists
          .mockResolvedValueOnce(null)             // Payables doesn't exist
          .mockResolvedValueOnce({ code: '751' }); // Net Salary exists

        // Mock getNextAvailableCode
        Konto.find = jest.fn().mockReturnValue({
          session: jest.fn().mockResolvedValue([])
        });

        // Mock Konto.create for Payables
        const mockPayables = { code: '201', name: 'Payables to Cleaner - Jane Cleaner' };
        Konto.create = jest.fn().mockResolvedValue([mockPayables]);

        // Execute
        const result = await KontoService.syncUserKontos();

        // Assertions
        expect(result.syncedCount).toBe(1);
        expect(result.errors).toEqual([]);
        expect(Konto.create).toHaveBeenCalledTimes(1);

        // Verify Konto.create was called with exact Payables data
        expect(Konto.create).toHaveBeenCalledWith(
          [
            {
              code: '201',
              name: 'Payables to Cleaner - Jane Cleaner',
              type: 'liability',
              employeeId: mockUserId,
              employeeName: 'Jane Cleaner',
              description: 'Payables to cleaning lady Jane Cleaner',
              currentBalance: 0,
              isActive: true
            }
          ],
          { session: null }
        );
      });
    });

    describe('Multiple users with mixed scenarios', () => {
      it('should sync kontos for multiple users correctly', async () => {
        const mockUsers = [
          { _id: 'user1', fname: 'John', lname: 'Owner', role: { name: 'OWNER' } },
          { _id: 'user2', fname: 'Jane', lname: 'Cleaner', role: { name: 'CLEANING_LADY' } },
          { _id: 'user3', fname: 'Bob', lname: 'Manager', role: { name: 'MANAGER' } }
        ];

        User.find = jest.fn().mockReturnValue({
          populate: jest.fn()
            .mockResolvedValueOnce(mockUsers)  // For Cash Registers sync
            .mockResolvedValueOnce(mockUsers)  // For CLEANING_LADY sync
        });

        // Mock User.findById for createCashRegisterForUser (will be called for user1)
        User.findById = jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            session: jest.fn().mockResolvedValue(mockUsers[0]) // Return user1
          })
        });

        // Mock Konto.findOne
        Konto.findOne = jest.fn()
          // User 1 (OWNER) - no Cash Register (_syncCashRegisters check)
          .mockResolvedValueOnce(null)
          // User 1 (OWNER) - no Cash Register (createCashRegisterForUser check)
          .mockReturnValueOnce({ session: jest.fn().mockResolvedValue(null) })
          // User 2 (CLEANING_LADY) - has Cash Register (_syncCashRegisters check)
          .mockResolvedValueOnce({ code: '102' })
          // User 3 (MANAGER) - has Cash Register (_syncCashRegisters check)
          .mockResolvedValueOnce({ code: '103' })
          // User 2 - no Payables (_syncCleaningLadyKontos check)
          .mockResolvedValueOnce(null)
          // User 2 - has Net Salary (_syncCleaningLadyKontos check)
          .mockResolvedValueOnce({ code: '751' });

        // Mock getNextAvailableCode
        Konto.find = jest.fn()
          .mockReturnValueOnce({ session: jest.fn().mockResolvedValue([]) })  // User 1 Cash Register
          .mockReturnValueOnce({ session: jest.fn().mockResolvedValue([]) }); // User 2 Payables

        // Mock Konto.create
        Konto.create = jest.fn()
          .mockResolvedValueOnce([{ code: '101' }])  // User 1 Cash Register
          .mockResolvedValueOnce([{ code: '201' }]); // User 2 Payables

        // Execute
        const result = await KontoService.syncUserKontos();

        // Assertions
        expect(result.syncedCount).toBe(2);  // 1 Cash Register + 1 Payables
        expect(result.errors).toEqual([]);
        expect(Konto.create).toHaveBeenCalledTimes(2);
      });
    });

    describe('Error handling - non-blocking', () => {
      it('should log error but continue when Payables creation fails for CLEANING_LADY', async () => {
        const mockUsers = [
          { _id: 'user1', fname: 'Jane', lname: 'Cleaner', role: { name: 'CLEANING_LADY' } }
        ];

        User.find = jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockUsers)
        });

        // Mock Konto.findOne
        Konto.findOne = jest.fn()
          .mockResolvedValueOnce({ code: '101' })  // Cash Register exists
          .mockResolvedValueOnce(null)             // Payables doesn't exist
          .mockResolvedValueOnce(null);            // Net Salary doesn't exist

        // Mock getNextAvailableCode
        Konto.find = jest.fn()
          .mockReturnValueOnce({ session: jest.fn().mockResolvedValue([]) })  // Payables
          .mockReturnValueOnce({ session: jest.fn().mockResolvedValue([]) }); // Net Salary

        // Mock Konto.create - Payables fails, Net Salary succeeds
        Konto.create = jest.fn()
          .mockRejectedValueOnce(new Error('Duplicate key'))
          .mockResolvedValueOnce([{ code: '751' }]);

        // Execute
        const result = await KontoService.syncUserKontos();

        // Assertions
        expect(result.syncedCount).toBe(1);  // Only Net Salary created
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('Failed to create Payables konto for Jane Cleaner');
        expect(result.errors[0]).toContain('Duplicate key');
      });
    });

    describe('No users in database', () => {
      it('should handle empty user list gracefully', async () => {
        User.find = jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue([])
        });

        // Execute
        const result = await KontoService.syncUserKontos();

        // Assertions
        expect(result.syncedCount).toBe(0);
        expect(result.errors).toEqual([]);
        expect(Konto.create).not.toHaveBeenCalled();
      });
    });
  });
});
