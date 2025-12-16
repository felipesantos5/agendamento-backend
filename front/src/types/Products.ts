export interface Product {
  _id: string;
  name: string;
  description?: string;
  price: {
    sale: number;
  };
  image?: string;
  category?: string;
  brand?: string;
  stock?: {
    current: number;
  };
}

export interface ProductsApiResponse {
  products: Product[];
  pagination?: {
    current: number;
    pages: number;
    total: number;
  };
}
