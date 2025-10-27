// models/konto/chartOfAccounts.js
// Chart of Accounts - Delta Apartmani

const chartOfAccounts = [

  // ====================================
  // 1. ASSETS (100-199)
  // ====================================

  // 10X - Employee Cash Registers
  // NOTE: Cash registers are now auto-generated during seed based on user roles
  // (CLEANING_LADY, HOST, MANAGER, OWNER)

  // 11X - Bank Accounts
  {
    code: '111',
    name: 'Bank Account - Main Bank',
    type: 'asset',
    isCashRegister: true,
    currentBalance: 0,
    description: 'Main business bank account'
  },
  {
    code: '112',
    name: 'Bank Account - Reserve Bank',
    type: 'asset',
    isCashRegister: true,
    currentBalance: 0,
    description: 'Reserve business bank account'
  },
  {
    code: '113',
    name: 'PayPal/Stripe/Online Payments',
    type: 'asset',
    isCashRegister: true,
    currentBalance: 0,
    description: 'Online payment platforms'
  },

  // 12X - Receivables
  {
    code: '121',
    name: 'Receivables from Guests',
    type: 'asset',
    isCashRegister: false,
    description: 'Unpaid accommodation from guests'
  },

  // ====================================
  // 2. LIABILITIES (200-299)
  // ====================================

  // 20X - Payables to Employees
  {
    code: '201',
    name: 'Payables to Hosts',
    type: 'liability',
    description: 'Unpaid salaries to hosts'
  },
  {
    code: '202',
    name: 'Payables to Cleaner - Elizabeta',
    type: 'liability',
    employeeName: 'Elizabeta',
    description: 'Unpaid salary'
  },
  {
    code: '203',
    name: 'Payables to Cleaner - Petra',
    type: 'liability',
    employeeName: 'Petra',
    description: 'Unpaid salary'
  },
  {
    code: '204',
    name: 'Payables to Cleaner - Ljilja',
    type: 'liability',
    employeeName: 'Ljilja',
    description: 'Unpaid salary'
  },
  {
    code: '205',
    name: 'Payables to Cleaner - Stanka',
    type: 'liability',
    employeeName: 'Stanka',
    description: 'Unpaid salary'
  },
  {
    code: '206',
    name: 'Payables to Cleaner - Jelena',
    type: 'liability',
    employeeName: 'Jelena',
    description: 'Unpaid salary'
  },
  {
    code: '207',
    name: 'Payables to Handyman',
    type: 'liability',
    description: 'Unpaid handyman salary'
  },

  // 21X - Payables to Suppliers
  {
    code: '211',
    name: 'Payables for Business Services',
    type: 'liability',
    description: 'Unpaid services (laundry, parking...)'
  },
  {
    code: '212',
    name: 'Payables for Utilities',
    type: 'liability',
    description: 'Unpaid utilities'
  },
  {
    code: '213',
    name: 'Payables to Apartment Owners',
    type: 'liability',
    description: 'Unpaid rent to owners'
  },

  // 22X - Tax Obligations
  {
    code: '221',
    name: 'Tax and Contribution Obligations',
    type: 'liability',
    description: 'Unpaid taxes on salaries'
  },
  {
    code: '222',
    name: 'Tourist Tax Obligations',
    type: 'liability',
    description: 'Collected but unpaid tourist tax'
  },

  // ====================================
  // 3. REVENUE (600-699)
  // ====================================

  // 60X - Accommodation Revenue (BY APARTMENT)
  {
    code: '601-01',
    name: 'Accommodation Revenue - Onyx',
    type: 'revenue',
    apartmentName: 'Onyx',
    description: 'Revenue from accommodation in apartment Onyx'
  },
  {
    code: '601-02',
    name: 'Accommodation Revenue - Margareta',
    type: 'revenue',
    apartmentName: 'Margareta',
    description: 'Revenue from accommodation in apartment Margareta'
  },
  {
    code: '601-03',
    name: 'Accommodation Revenue - Luna',
    type: 'revenue',
    apartmentName: 'Luna',
    description: 'Revenue from accommodation in apartment Luna'
  },
  {
    code: '601-04',
    name: 'Accommodation Revenue - Neva',
    type: 'revenue',
    apartmentName: 'Neva',
    description: 'Revenue from accommodation in apartment Neva'
  },
  {
    code: '601-05',
    name: 'Accommodation Revenue - Makao',
    type: 'revenue',
    apartmentName: 'Makao',
    description: 'Revenue from accommodation in apartment Makao'
  },
  {
    code: '601-06',
    name: 'Accommodation Revenue - Berlin',
    type: 'revenue',
    apartmentName: 'Berlin',
    description: 'Revenue from accommodation in apartment Berlin'
  },
  {
    code: '601-07',
    name: 'Accommodation Revenue - Modena',
    type: 'revenue',
    apartmentName: 'Modena',
    description: 'Revenue from accommodation in apartment Modena'
  },
  {
    code: '601-08',
    name: 'Accommodation Revenue - Eli',
    type: 'revenue',
    apartmentName: 'Eli',
    description: 'Revenue from accommodation in apartment Eli'
  },
  {
    code: '601-09',
    name: 'Accommodation Revenue - Kapiten',
    type: 'revenue',
    apartmentName: 'Kapiten',
    description: 'Revenue from accommodation in apartment Kapiten'
  },
  {
    code: '601-10',
    name: 'Accommodation Revenue - Devetka',
    type: 'revenue',
    apartmentName: 'Devetka',
    description: 'Revenue from accommodation in apartment Devetka'
  },
  {
    code: '601-11',
    name: 'Accommodation Revenue - Orange',
    type: 'revenue',
    apartmentName: 'Orange',
    description: 'Revenue from accommodation in apartment Orange'
  },
  {
    code: '601-12',
    name: 'Accommodation Revenue - Mona',
    type: 'revenue',
    apartmentName: 'Mona',
    description: 'Revenue from accommodation in apartment Mona'
  },
  {
    code: '601-13',
    name: 'Accommodation Revenue - Caruso',
    type: 'revenue',
    apartmentName: 'Caruso',
    description: 'Revenue from accommodation in apartment Caruso'
  },
  {
    code: '601-14',
    name: 'Accommodation Revenue - Atlas',
    type: 'revenue',
    apartmentName: 'Atlas',
    description: 'Revenue from accommodation in apartment Atlas'
  },
  {
    code: '601-15',
    name: 'Accommodation Revenue - Egzotik',
    type: 'revenue',
    apartmentName: 'Egzotik',
    description: 'Revenue from accommodation in apartment Egzotik'
  },
  {
    code: '601-16',
    name: 'Accommodation Revenue - Porto',
    type: 'revenue',
    apartmentName: 'Porto',
    description: 'Revenue from accommodation in apartment Porto'
  },
  {
    code: '601-17',
    name: 'Accommodation Revenue - Mimoza',
    type: 'revenue',
    apartmentName: 'Mimoza',
    description: 'Revenue from accommodation in apartment Mimoza'
  },
  {
    code: '601-18',
    name: 'Accommodation Revenue - Neven',
    type: 'revenue',
    apartmentName: 'Neven',
    description: 'Revenue from accommodation in apartment Neven'
  },

  // 69X - Other Revenue
  {
    code: '691',
    name: 'Tourist Tax Collected',
    type: 'revenue',
    description: 'Tourist tax collected from guests'
  },
  {
    code: '692',
    name: 'Other Revenue',
    type: 'revenue',
    description: 'Miscellaneous revenue'
  },

  // ====================================
  // 4. EXPENSES (700-899)
  // ====================================

  // 70X - Rent to Owners (BY APARTMENT)
  {
    code: '701-01',
    name: 'Rent to Owner - Onyx',
    type: 'expense',
    apartmentName: 'Onyx',
    description: 'Monthly rent to owner of apartment Onyx'
  },
  {
    code: '701-02',
    name: 'Rent to Owner - Margareta',
    type: 'expense',
    apartmentName: 'Margareta',
    description: 'Monthly rent to owner of apartment Margareta'
  },
  {
    code: '701-03',
    name: 'Rent to Owner - Luna',
    type: 'expense',
    apartmentName: 'Luna',
    description: 'Monthly rent to owner of apartment Luna'
  },
  {
    code: '701-04',
    name: 'Rent to Owner - Neva',
    type: 'expense',
    apartmentName: 'Neva',
    description: 'Monthly rent to owner of apartment Neva'
  },
  {
    code: '701-05',
    name: 'Rent to Owner - Makao',
    type: 'expense',
    apartmentName: 'Makao',
    description: 'Monthly rent to owner of apartment Makao'
  },
  {
    code: '701-06',
    name: 'Rent to Owner - Berlin',
    type: 'expense',
    apartmentName: 'Berlin',
    description: 'Monthly rent to owner of apartment Berlin'
  },
  {
    code: '701-07',
    name: 'Rent to Owner - Modena',
    type: 'expense',
    apartmentName: 'Modena',
    description: 'Monthly rent to owner of apartment Modena'
  },
  {
    code: '701-08',
    name: 'Rent to Owner - Eli',
    type: 'expense',
    apartmentName: 'Eli',
    description: 'Monthly rent to owner of apartment Eli'
  },
  {
    code: '701-09',
    name: 'Rent to Owner - Kapiten',
    type: 'expense',
    apartmentName: 'Kapiten',
    description: 'Monthly rent to owner of apartment Kapiten'
  },
  {
    code: '701-10',
    name: 'Rent to Owner - Devetka',
    type: 'expense',
    apartmentName: 'Devetka',
    description: 'Monthly rent to owner of apartment Devetka'
  },
  {
    code: '701-11',
    name: 'Rent to Owner - Orange',
    type: 'expense',
    apartmentName: 'Orange',
    description: 'Monthly rent to owner of apartment Orange'
  },
  {
    code: '701-12',
    name: 'Rent to Owner - Mona',
    type: 'expense',
    apartmentName: 'Mona',
    description: 'Monthly rent to owner of apartment Mona'
  },
  {
    code: '701-13',
    name: 'Rent to Owner - Caruso',
    type: 'expense',
    apartmentName: 'Caruso',
    description: 'Monthly rent to owner of apartment Caruso'
  },
  {
    code: '701-14',
    name: 'Rent to Owner - Atlas',
    type: 'expense',
    apartmentName: 'Atlas',
    description: 'Monthly rent to owner of apartment Atlas'
  },
  {
    code: '701-15',
    name: 'Rent to Owner - Egzotik',
    type: 'expense',
    apartmentName: 'Egzotik',
    description: 'Monthly rent to owner of apartment Egzotik'
  },
  {
    code: '701-16',
    name: 'Rent to Owner - Porto',
    type: 'expense',
    apartmentName: 'Porto',
    description: 'Monthly rent to owner of apartment Porto'
  },
  {
    code: '701-17',
    name: 'Rent to Owner - Mimoza',
    type: 'expense',
    apartmentName: 'Mimoza',
    description: 'Monthly rent to owner of apartment Mimoza'
  },
  {
    code: '701-18',
    name: 'Rent to Owner - Neven',
    type: 'expense',
    apartmentName: 'Neven',
    description: 'Monthly rent to owner of apartment Neven'
  },

  // 72X - Utilities (SUMMARY)
  {
    code: '721',
    name: 'Utilities - Electricity',
    type: 'expense',
    description: 'Electricity costs for all apartments (tracked per apartment via apartmentId)'
  },
  {
    code: '722',
    name: 'Utilities - Infostan',
    type: 'expense',
    description: 'Infostan utilities (tracked per apartment via apartmentId)'
  },
  {
    code: '723',
    name: 'Utilities - Building Maintenance',
    type: 'expense',
    description: 'Residential building maintenance (tracked per apartment via apartmentId)'
  },
  {
    code: '724',
    name: 'Utilities - Garage Maintenance',
    type: 'expense',
    description: 'Garage space maintenance (tracked per apartment via apartmentId)'
  },
  {
    code: '725',
    name: 'Utilities - Internet and Cable TV',
    type: 'expense',
    description: 'Internet and TV subscription (tracked per apartment via apartmentId)'
  },

  // 74X - Host Salaries
  {
    code: '741',
    name: 'Net Salary - Hosts',
    type: 'expense',
    description: 'Net salary for hosts who check in guests'
  },
  {
    code: '742',
    name: 'Night Shift Bonus (5€ after 11pm)',
    type: 'expense',
    description: '5€ bonus for guest check-in after 11pm'
  },

  // 75X - Cleaner Salaries
  {
    code: '751',
    name: 'Net Salary - Elizabeta',
    type: 'expense',
    employeeName: 'Elizabeta',
    description: 'Net salary for cleaner Elizabeta'
  },
  {
    code: '752',
    name: 'Net Salary - Petra',
    type: 'expense',
    employeeName: 'Petra',
    description: 'Net salary for cleaner Petra'
  },
  {
    code: '753',
    name: 'Net Salary - Ljilja',
    type: 'expense',
    employeeName: 'Ljilja',
    description: 'Net salary for cleaner Ljilja'
  },
  {
    code: '754',
    name: 'Net Salary - Stanka',
    type: 'expense',
    employeeName: 'Stanka',
    description: 'Net salary for cleaner Stanka'
  },
  {
    code: '755',
    name: 'Net Salary - Jelena',
    type: 'expense',
    employeeName: 'Jelena',
    description: 'Net salary for cleaner Jelena'
  },

  // 76X - Handyman Salaries
  {
    code: '761',
    name: 'Net Salary - Handyman',
    type: 'expense',
    description: 'Net salary for maintenance handyman'
  },

  // 77X - Taxes and Contributions
  {
    code: '771',
    name: 'Taxes and Contributions on Salaries',
    type: 'expense',
    description: 'Taxes and contributions on employee salaries'
  },
  {
    code: '772',
    name: 'Tourist Tax Paid to Government',
    type: 'expense',
    description: 'Tourist tax remitted to government'
  },

  // 78X - Booking Agency Commissions
  {
    code: '781',
    name: 'Commission - Booking.com',
    type: 'expense',
    description: 'Commission for reservations via Booking.com (tracked per apartment)'
  },
  {
    code: '782',
    name: 'Commission - Airbnb',
    type: 'expense',
    description: 'Commission for reservations via Airbnb (tracked per apartment)'
  },
  {
    code: '783',
    name: 'Commission - Stannadan',
    type: 'expense',
    description: 'Commission for reservations via Stannadan (tracked per apartment)'
  },
  {
    code: '784',
    name: 'Commission - Novi apartmani',
    type: 'expense',
    description: 'Commission for reservations via Novi apartmani (tracked per apartment)'
  },
  {
    code: '785',
    name: 'Commission - Beoapartman',
    type: 'expense',
    description: 'Commission for reservations via Beoapartman (tracked per apartment)'
  },
  {
    code: '786',
    name: 'Commission - Partners (colleagues)',
    type: 'expense',
    description: 'Commission when a colleague sends a guest (tracked per apartment)'
  },

  // 79X - Business Services
  {
    code: '791',
    name: 'Laundry and Ironing Services',
    type: 'expense',
    description: 'Laundry services for linens (tracked per apartment)'
  },
  {
    code: '792',
    name: 'Parking Space Rental',
    type: 'expense',
    description: 'Parking space rental (tracked per apartment)'
  },

  // 80X - Consumables
  {
    code: '801',
    name: 'Cleaning Chemicals',
    type: 'expense',
    description: 'Detergents and cleaning supplies (tracked per apartment)'
  },
  {
    code: '802',
    name: 'Toilet Paper',
    type: 'expense',
    description: 'Toilet paper for apartments (tracked per apartment)'
  },
  {
    code: '803',
    name: 'Shampoo, Bath Gel, Soap',
    type: 'expense',
    description: 'Hygiene products for guests (tracked per apartment)'
  },
  {
    code: '804',
    name: 'Other Consumables',
    type: 'expense',
    description: 'Other small consumable items (tracked per apartment)'
  },

  // 81X - Current Maintenance
  {
    code: '811',
    name: 'Carpets, Curtains, Textiles',
    type: 'expense',
    description: 'Purchase and replacement of textiles (tracked per apartment)'
  },
  {
    code: '812',
    name: 'Boiler and Appliance Repairs',
    type: 'expense',
    description: 'Repairs of technical equipment (tracked per apartment)'
  },
  {
    code: '813',
    name: 'Locks and Keys',
    type: 'expense',
    description: 'Key cutting and lock repairs (tracked per apartment)'
  },
  {
    code: '814',
    name: 'Other Current Maintenance',
    type: 'expense',
    description: 'Miscellaneous maintenance (tracked per apartment)'
  },

  // 82X - Marketing and Advertising
  {
    code: '821',
    name: 'Marketing - Online Ads',
    type: 'expense',
    description: 'Google Ads, Facebook Ads, etc. (tracked per apartment)'
  },
  {
    code: '822',
    name: 'Marketing - Photography',
    type: 'expense',
    description: 'Professional apartment photography (tracked per apartment)'
  },
  {
    code: '823',
    name: 'Marketing - Other',
    type: 'expense',
    description: 'Other marketing costs (tracked per apartment)'
  },

  // 89X - Extraordinary Expenses
  {
    code: '891',
    name: 'Extraordinary Expenses',
    type: 'expense',
    description: 'Unforeseen and extraordinary expenses'
  }
];

module.exports = chartOfAccounts;
