export type Role = 'ADMIN' | 'DISPATCHER' | 'CAPTAIN';
export type BoatStatus = 'FREE' | 'ON_TRIP' | 'MAINTENANCE';
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'ACQUIRING';
export type TripStatus = 'CREATED' | 'IN_PROGRESS' | 'COMPLETED';

export interface User {
  id: string;
  name: string;
  role: Role;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  captainBoat?: BoatCaptain;
  captainRate?: CaptainRate;
  dispatcherRate?: DispatcherRate;
}

export interface Boat {
  id: string;
  name: string;
  status: BoatStatus;
  isActive: boolean;
  captain?: BoatCaptain;
  createdAt: string;
}

export interface BoatCaptain {
  id: string;
  boatId: string;
  captainId: string;
  boat?: Boat;
  captain?: Pick<User, 'id' | 'name'>;
}

export interface Pier {
  id: string;
  name: string;
  cost: number;
  isActive: boolean;
  createdAt: string;
}

export interface CaptainRate {
  id: string;
  captainId: string;
  hourlyRate: number;
  exitPayment: number;
}

export interface DispatcherRate {
  id: string;
  dispatcherId: string;
  ratePerTrip: number;
}

export interface Trip {
  id: string;
  boatId: string;
  captainId: string;
  dispatcherId: string | null;
  pierId: string;
  price: number;
  paymentMethod: PaymentMethod;
  status: TripStatus;
  startedAt: string | null;
  endedAt: string | null;
  durationMinutes: number | null;
  captainSalary: number | null;
  dispatcherPayment: number | null;
  pierCost: number;
  profit: number | null;
  date: string;
  createdAt: string;
  boat: Boat;
  captain: Pick<User, 'id' | 'name'>;
  dispatcher: Pick<User, 'id' | 'name'> | null;
  pier: Pier;
}

export interface Expense {
  id: string;
  captainId: string;
  amount: number;
  comment: string;
  date: string;
  createdAt: string;
  captain?: Pick<User, 'id' | 'name'>;
}

export interface DailyBalance {
  id: string;
  captainId: string;
  date: string;
  cashIncome: number;
  captainSalary: number;
  exitPayment: number;
  expensesTotal: number;
  balance: number;
  isClosed: boolean;
  captain?: Pick<User, 'id' | 'name'>;
}

export interface DailySummary {
  date: string;
  trips: number;
  totalRevenue: number;
  totalCaptainSalary: number;
  totalDispatcherPayment: number;
  totalPierCost: number;
  totalExpenses: number;
  totalProfit: number;
  captainBalances: DailyBalance[];
}
