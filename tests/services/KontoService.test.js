// tests/services/KontoService.test.js

const KontoService = require('../../services/accounting/KontoService');
const Konto = require('../../models/konto/Konto');
const Apartment = require('../../models/Apartment');

// Mock models
jest.mock('../../models/konto/Konto');
jest.mock('../../models/Apartment');

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
        // First call for revenue code '601-'
        // Second call for rent code '701-'
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

        Konto.create = jest.fn().mockResolvedValue([mockRevenueKonto, mockRentKonto]);

        // Execute
        const result = await KontoService.createKontosForApartment(mockApartmentId, mockApartmentName);

        // Assertions
        expect(result).toEqual({
          revenueKonto: mockRevenueKonto,
          rentKonto: mockRentKonto
        });

        // Verify Konto.create was called with correct data
        expect(Konto.create).toHaveBeenCalledWith(
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
            },
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

        // Mock Konto.create
        const mockRevenueKonto = { code: '601-4', name: `Accommodation Revenue - ${mockApartmentName}` };
        const mockRentKonto = { code: '701-3', name: `Rent to Owner - ${mockApartmentName}` };
        Konto.create = jest.fn().mockResolvedValue([mockRevenueKonto, mockRentKonto]);

        // Execute
        const result = await KontoService.createKontosForApartment(mockApartmentId, mockApartmentName);

        // Assertions
        expect(result.revenueKonto.code).toBe('601-4');
        expect(result.rentKonto.code).toBe('701-3');
      });
    });
  });
});
