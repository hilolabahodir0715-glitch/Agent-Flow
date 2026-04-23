export interface Client {
  id?: string;
  name: string;
  address?: string;
  phone?: string;
  balance: number;
  agentId: string;
  createdAt: string;
}

export interface Product {
  id?: string;
  name: string;
  price: number;
  unit?: string;
  stock: number;
  agentId: string;
}

export interface Receipt {
  id?: string;
  productId: string;
  productName: string;
  quantity: number;
  source: string; // e.g., "MEGAMIR"
  agentId: string;
  createdAt: any; // Timestamp
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id?: string;
  clientId: string;
  agentId: string;
  items: OrderItem[];
  totalAmount: number;
  createdAt: any; // Timestamp
}

export interface Payment {
  id?: string;
  clientId: string;
  agentId: string;
  amount: number;
  method: 'cash' | 'transfer' | 'bill';
  createdAt: any; // Timestamp
  note?: string;
}

export interface Reminder {
  id?: string;
  clientId: string;
  clientName: string;
  agentId: string;
  dueDate: any; // Timestamp or ISO string
  note: string;
  completed: boolean;
  createdAt: any; // Timestamp
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}
