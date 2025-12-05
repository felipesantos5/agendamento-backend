// types/product.ts
export interface Product {
  _id: string;
  name: string;
  description?: string;
  category: string;
  brand?: string;
  price: {
    purchase: number;
    sale: number;
  };
  stock: {
    current: number;
    minimum: number;
    maximum?: number;
  };
  image?: string;
  status: "ativo" | "inativo" | "descontinuado";
  isLowStock: boolean;
  profitMargin: number;
  createdAt: string;
  updatedAt: string;
  commissionRate?: number;
}

export interface StockMovement {
  _id: string;
  type: "entrada" | "saida" | "venda";
  quantity: number;
  reason: string;
  previousStock: number;
  newStock: number;
  unitCost?: number;
  totalCost?: number;
  notes?: string;
  createdAt: string;
}
