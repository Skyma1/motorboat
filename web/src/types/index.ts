export type Role = 'ADMIN' | 'DISPATCHER' | 'CAPTAIN';
export type BoatStatus = 'FREE' | 'ON_TRIP' | 'MAINTENANCE';
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'ACQUIRING';
export type TripStatus = 'CREATED' | 'IN_PROGRESS' | 'COMPLETED';
export type DockingType = 'PRIVATE' | 'CITY';

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

export interface Trip {
  id: string;
  boatId: string;
  captainId: string;
  dispatcherId: string | null;
  pierId: string | null;
  price: number;
  paymentMethod: PaymentMethod;
  status: TripStatus;
  startedAt: string | null;
  endedAt: string | null;
  durationMinutes: number | null;
  captainSalary: number | null;
  pierCost: number;
  dockingType: DockingType | null;
  cityDockHours: number | null;
  profit: number | null;
  date: string;
  createdAt: string;
  boat: Boat;
  captain: Pick<User, 'id' | 'name'>;
  dispatcher: Pick<User, 'id' | 'name'> | null;
  pier: Pier | null;
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
  handover?: CashHandover | null;
}

export interface CashHandover {
  id: string;
  captainId: string;
  forDate: string;
  amount: number;
  receiverText: string;
  createdByCaptainAt: string;
  editedByDispatcherAt: string | null;
  editedByDispatcherId: string | null;
}

export interface DailySummary {
  date: string;
  trips: number;
  totalRevenue: number;
  totalCaptainSalary: number;
  totalPierCost: number;
  totalExpenses: number;
  totalPartTimeIncome: number;
  totalFuelExpenses: number;
  totalProfit: number;
  captainBalances: DailyBalance[];
}
