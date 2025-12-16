import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import apiClient from "./../../../services/api";
import { AnimatePresence, motion } from "framer-motion";

// Tipos
interface Product {
  _id: string;
  name: string;
  description?: string;
  category: string;
  brand?: string;
  price: number;
  unit: string;
  image?: string;
}

// const CATEGORIES = [
//   { value: "all", label: "Todas as categorias" },
//   { value: "pomada", label: "Pomada" },
//   { value: "gel", label: "Gel" },
//   { value: "shampoo", label: "Shampoo" },
//   { value: "condicionador", label: "Condicionador" },
//   { value: "minoxidil", label: "Minoxidil" },
//   { value: "oleo", label: "Óleo" },
//   { value: "cera", label: "Cera" },
//   { value: "spray", label: "Spray" },
//   { value: "outros", label: "Outros" },
// ];

const sectionAnimation = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
  transition: { duration: 0.3, ease: "easeInOut" },
};

// Componente do Card do Produto
function ProductCard({ product }: { product: Product }) {
  // const getCategoryLabel = (category: string) => CATEGORIES.find((cat) => cat.value === category)?.label || category;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300">
      <CardContent className="p-4">
        <div className="aspect-square mb-4 bg-gray-100 rounded-lg overflow-hidden">
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          {/* <Badge variant="secondary" className="text-xs">
            {getCategoryLabel(product.category)}
          </Badge> */}

          <h3 className="font-semibold text-lg leading-tight line-clamp-2">{product.name}</h3>

          {product.brand && <p className="text-sm text-gray-600">{product.brand}</p>}

          {product.description && <p className="text-sm text-gray-500 line-clamp-4">{product.description}</p>}

          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-2xl font-bold text-green-600">
                R${" "}
                {product.price.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente Principal
export function CustomerProductsPage() {
  const { slug } = useParams<{ slug: string }>();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
  });

  // Filtros
  const [filters, setFilters] = useState({
    category: "all",
    search: "",
    page: 1,
    limit: 12,
  });

  // Buscar produtos
  const fetchProducts = async () => {
    if (!slug) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        status: "ativo",
        page: filters.page.toString(),
        limit: filters.limit.toString(),
      });

      if (filters.category !== "all") params.append("category", filters.category);
      if (filters.search) params.append("search", filters.search);

      // ✅ CORREÇÃO AQUI: Adicione o objeto { params } na requisição
      const response = await apiClient.get(`/api/barbershops/${slug}/products/store`, {
        params: params,
      });

      setProducts(response.data.products);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [slug, filters]); // A dependência [filters] já está correta

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="services" // Chave única para o AnimatePresence identificar o elemento
        initial={sectionAnimation.initial}
        animate={sectionAnimation.animate}
        exit={sectionAnimation.exit}
        className="space-y-4"
      >
        <div className="">
          <div className="container mx-auto px-4 py-8">
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum produto encontrado</h3>
              </div>
            )}

            {/* Paginação */}
            {pagination.pages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.current - 1)} disabled={pagination.current <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                    let page;
                    if (pagination.pages <= 5) {
                      page = i + 1;
                    } else if (pagination.current <= 3) {
                      page = i + 1;
                    } else if (pagination.current >= pagination.pages - 2) {
                      page = pagination.pages - 4 + i;
                    } else {
                      page = pagination.current - 2 + i;
                    }

                    return (
                      <Button
                        key={page}
                        variant={page === pagination.current ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="w-10"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.current + 1)}
                  disabled={pagination.current >= pagination.pages}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
