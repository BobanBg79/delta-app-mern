const { calculateNightsByMonth, calculateMonthlyRevenue, calculateMonthlyAllocation, calculateRefundAllocation } = require('../../utils/reservationAccounting');

// Mock getFiscalPeriod function since we don't need full fiscal logic for these tests
jest.mock('../../models/konto/kontoBalanceLogic', () => ({
  getFiscalPeriod: (date) => ({
    fiscalYear: date.getFullYear(),
    fiscalMonth: date.getMonth() + 1
  })
}));

describe('ReservationAccounting', () => {
  describe('calculateNightsByMonth', () => {
    test('should calculate 2 nights in October for 30.10 - 01.11 reservation', () => {
      // Arrange
      const checkIn = new Date('2025-10-30');
      const checkOut = new Date('2025-11-01');
      
      // Act
      const result = calculateNightsByMonth(checkIn, checkOut);
      
      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].fiscalYear).toBe(2025);
      expect(result[0].fiscalMonth).toBe(10);
      expect(result[0].nights).toBe(2);
    });

    test('should calculate cross-month reservation correctly (31.10 - 02.11)', () => {
      // Arrange
      const checkIn = new Date('2025-10-31');
      const checkOut = new Date('2025-11-02');
      
      // Act
      const result = calculateNightsByMonth(checkIn, checkOut);
      
      // Assert
      expect(result).toHaveLength(2);
      
      const octNights = result.find(m => m.fiscalMonth === 10);
      const novNights = result.find(m => m.fiscalMonth === 11);
      
      expect(octNights.nights).toBe(1);
      expect(novNights.nights).toBe(1);
    });

    test('should calculate multi-month reservation correctly (28.10 - 15.12)', () => {
      // Arrange
      const checkIn = new Date('2025-10-28');
      const checkOut = new Date('2025-12-15');
      
      // Act
      const result = calculateNightsByMonth(checkIn, checkOut);
      
      // Assert
      expect(result).toHaveLength(3);
      
      const octNights = result.find(m => m.fiscalMonth === 10)?.nights || 0;
      const novNights = result.find(m => m.fiscalMonth === 11)?.nights || 0;
      const decNights = result.find(m => m.fiscalMonth === 12)?.nights || 0;
      
      expect(octNights).toBe(4);  // 28, 29, 30, 31 Oct
      expect(novNights).toBe(30); // All of November
      expect(decNights).toBe(14); // 1-14 Dec
    });

    test('should throw error for invalid dates', () => {
      // Arrange
      const checkIn = new Date('2025-11-01');
      const checkOut = new Date('2025-10-30'); // Check-out before check-in
      
      // Act & Assert
      expect(() => {
        calculateNightsByMonth(checkIn, checkOut);
      }).toThrow('Check-in date must be before check-out date');
    });

    test('should handle same month reservation', () => {
      // Arrange
      const checkIn = new Date('2025-10-15');
      const checkOut = new Date('2025-10-20');
      
      // Act
      const result = calculateNightsByMonth(checkIn, checkOut);
      
      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].fiscalYear).toBe(2025);
      expect(result[0].fiscalMonth).toBe(10);
      expect(result[0].nights).toBe(5);
    });
  });

  describe('calculateMonthlyRevenue', () => {
    test('should calculate correct revenue for Onyx apartment reservation', () => {
      // Arrange - Reproducing the real scenario
      const reservation = {
        plannedCheckIn: new Date('2025-10-30'),
        plannedCheckOut: new Date('2025-11-01'),
        pricePerNight: 65
      };
      
      // Act
      const result = calculateMonthlyRevenue(reservation);
      
      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].fiscalMonth).toBe(10);
      expect(result[0].nights).toBe(2);
      expect(result[0].amount).toBe(130); // 2 nights × 65€ = 130€
    });

    test('should calculate revenue for cross-month reservation', () => {
      // Arrange
      const reservation = {
        plannedCheckIn: new Date('2025-10-31'),
        plannedCheckOut: new Date('2025-11-02'),
        pricePerNight: 100
      };
      
      // Act
      const result = calculateMonthlyRevenue(reservation);
      
      // Assert
      expect(result).toHaveLength(2);
      
      const octRevenue = result.find(m => m.fiscalMonth === 10);
      const novRevenue = result.find(m => m.fiscalMonth === 11);
      
      expect(octRevenue.nights).toBe(1);
      expect(octRevenue.amount).toBe(100);
      expect(novRevenue.nights).toBe(1);
      expect(novRevenue.amount).toBe(100);
    });

    test('should throw error for missing required fields', () => {
      // Arrange
      const invalidReservation = {
        plannedCheckIn: new Date('2025-10-30'),
        // missing plannedCheckOut
        pricePerNight: 65
      };
      
      // Act & Assert
      expect(() => {
        calculateMonthlyRevenue(invalidReservation);
      }).toThrow('Reservation must have plannedCheckIn and plannedCheckOut dates');
    });
  });

  describe('calculateMonthlyAllocation', () => {
    test('should allocate full payment to single month (Onyx scenario)', () => {
      // Arrange
      const reservation = {
        plannedCheckIn: new Date('2025-10-30'),
        plannedCheckOut: new Date('2025-11-01'),
        pricePerNight: 65
      };
      const newPaymentAmount = 130;
      const existingTransactions = []; // No existing payments
      
      // Act
      const result = calculateMonthlyAllocation(reservation, newPaymentAmount, existingTransactions);
      
      // Assert
      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0].fiscalMonth).toBe(10);
      expect(result.allocations[0].amount).toBe(130);
      expect(result.overpayment).toBe(0);
      expect(result.totalReservation).toBe(130);
      expect(result.totalPaid).toBe(130);
    });

    test('should detect overpayment', () => {
      // Arrange
      const reservation = {
        plannedCheckIn: new Date('2025-10-30'),
        plannedCheckOut: new Date('2025-11-01'),
        pricePerNight: 65
      };
      const newPaymentAmount = 200; // More than needed (130€)
      const existingTransactions = [];
      
      // Act
      const result = calculateMonthlyAllocation(reservation, newPaymentAmount, existingTransactions);
      
      // Assert
      expect(result.allocations[0].amount).toBe(130);
      expect(result.overpayment).toBe(70); // 200 - 130
      expect(result.totalReservation).toBe(130);
      expect(result.totalPaid).toBe(200);
    });

    test('should handle partial payments correctly', () => {
      // Arrange
      const reservation = {
        plannedCheckIn: new Date('2025-10-28'),
        plannedCheckOut: new Date('2025-12-15'),
        pricePerNight: 100
      };
      // Oct(4×100=400) + Nov(30×100=3000) + Dec(14×100=1400) = 4800€ total
      
      const newPaymentAmount = 1500;
      const existingTransactions = []; // No existing payments
      
      // Act
      const result = calculateMonthlyAllocation(reservation, newPaymentAmount, existingTransactions);
      
      // Assert
      expect(result.allocations).toHaveLength(2);
      
      // Should fill October completely (400€) and November partially (1100€)
      const octAllocation = result.allocations.find(a => a.fiscalMonth === 10);
      const novAllocation = result.allocations.find(a => a.fiscalMonth === 11);
      
      expect(octAllocation.amount).toBe(400);
      expect(novAllocation.amount).toBe(1100);
      expect(result.overpayment).toBe(0);
    });
  });
  
  describe('calculateRefundAllocation - Shortened Reservation Fix', () => {
    test('should handle shortened reservation refunds correctly', () => {
      // Arrange: Original reservation was 30.10 - 03.11 (4 nights)
      // Now shortened to 30.10 - 01.11 (2 nights)
      // User paid 400€ for original reservation (2×Oct + 2×Nov)
      // Should refund 200€ for the 2 nights in November
      
      // This represents SHORTENED reservation (after update)
      const shortenedReservation = {
        plannedCheckIn: new Date('2025-10-30'),
        plannedCheckOut: new Date('2025-11-01'), // Shortened!
        pricePerNight: 100
      };
      
      // This represents existing transactions from ORIGINAL reservation
      // 2 transactions: Oct(200€) + Nov(200€) = 400€ total
      const existingTransactions = [
        { credit: 200, fiscalYear: 2025, fiscalMonth: 10 }, // Oct payment
        { credit: 200, fiscalYear: 2025, fiscalMonth: 11 }  // Nov payment
      ];
      
      const refundAmount = 200; // Refund for 2 nights in November
      
      // Act - Let's see what actually happens
      const result = calculateRefundAllocation(
        shortenedReservation, 
        refundAmount, 
        existingTransactions
      );
      
      // Assert - FIXED: refund is correctly allocated to November
      // even though shortened reservation has no November nights
      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0].fiscalYear).toBe(2025);
      expect(result.allocations[0].fiscalMonth).toBe(11); // ✓ November!
      expect(result.allocations[0].amount).toBe(200);
      
      // Total paid from original transactions
      expect(result.totalPaid).toBe(400);
      expect(result.totalAfterRefund).toBe(200);
      
      console.log('✓ FIXED: Refund correctly allocated to November:', JSON.stringify(result.allocations, null, 2));
    });

    test('should handle complex multi-month refund correctly', () => {
      // Arrange: Complex scenario with payments across multiple months
      const shortenedReservation = {
        plannedCheckIn: new Date('2025-10-30'),
        plannedCheckOut: new Date('2025-11-01'), // Shortened to 2 nights
        pricePerNight: 100
      };
      
      // Original payments were: Oct(200) + Nov(300) + Dec(150) = 650€ total
      const existingTransactions = [
        { credit: 200, fiscalYear: 2025, fiscalMonth: 10 },
        { credit: 300, fiscalYear: 2025, fiscalMonth: 11 },
        { credit: 150, fiscalYear: 2025, fiscalMonth: 12 }
      ];
      
      const refundAmount = 400; // Refund 400€ (should come from Dec(150) + Nov(250))
      
      // Act
      const result = calculateRefundAllocation(
        shortenedReservation, 
        refundAmount, 
        existingTransactions
      );
      
      // Assert
      expect(result.allocations).toHaveLength(2);
      
      // Should refund from Dec first (150), then Nov (250)
      const novRefund = result.allocations.find(a => a.fiscalMonth === 11);
      const decRefund = result.allocations.find(a => a.fiscalMonth === 12);
      
      expect(decRefund.amount).toBe(150); // Full December refunded
      expect(novRefund.amount).toBe(250); // Partial November refunded
      
      expect(result.totalPaid).toBe(650);
      expect(result.totalAfterRefund).toBe(250); // 650 - 400
    });
  });
});