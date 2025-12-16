import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "@/services/api";
import { toast } from "sonner";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";

// Imports de UI
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Loader2, CheckCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

// Tipagem para uma avaliação recebida da API
interface Review {
  _id: string;
  rating: number;
  comment?: string;
  customer: { name: string; _id: string };
  createdAt: string;
}

const sectionAnimation = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
  transition: { duration: 0.3, ease: "easeInOut" },
};

// Componente para renderizar as estrelas de forma visual
const StarRating = ({ rating, setRating, interactive = false }: { rating: number; setRating?: (r: number) => void; interactive?: boolean }) => (
  <div className="flex gap-1 text-yellow-400">
    {[...Array(5)].map((_, i) => {
      const ratingValue = i + 1;
      return (
        <Star
          key={i}
          size={interactive ? 32 : 20}
          className={`
            ${interactive ? "cursor-pointer" : ""}
            ${ratingValue <= rating ? "fill-current" : "text-gray-300"}
          `}
          onClick={() => interactive && setRating?.(ratingValue)}
        />
      );
    })}
  </div>
);

// Prop para receber o ID da barbearia da página principal `Loja`
interface ReviewsPaneProps {
  barbershopId: string;
}

export function ReviewsPane({ barbershopId }: ReviewsPaneProps) {
  const { isAuthenticated, customer } = useCustomerAuth();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [hasUserReviewed, setHasUserReviewed] = useState(false);

  const [myRating, setMyRating] = useState(5);
  const [myComment, setMyComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReviews = async () => {
    if (!barbershopId) return;
    try {
      const response = await apiClient.get(`api/barbershops/${barbershopId}/reviews`);
      setReviews(response.data);

      // ✅ Verificar se o usuário logado já fez uma avaliação
      if (isAuthenticated && customer?._id) {
        const userReview = response.data.find((review: Review) => review.customer?._id === customer._id);
        setHasUserReviewed(!!userReview);
      }
    } catch (error) {
      toast.error("Erro ao buscar avaliações.");
    } finally {
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [barbershopId, isAuthenticated, customer]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post(`api/barbershops/${barbershopId}/reviews`, {
        rating: myRating,
        comment: myComment,
      });

      toast.success("Obrigado pela sua avaliação!");
      setMyComment("");
      setMyRating(5);
      setHasUserReviewed(true);
      fetchReviews();
    } catch (error) {
      toast.error("Ocorreu um erro ao enviar sua avaliação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="services"
        initial={sectionAnimation.initial}
        animate={sectionAnimation.animate}
        exit={sectionAnimation.exit}
        className="p-6 sm:p-8 space-y-8"
      >
        <div className="space-y-4">
          {reviews.map((review) => (
            <>
              {review.customer?.name && (
                <Card key={review._id} className="gap-2 py-3">
                  <CardHeader className="gap-0 px-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{review.customer?.name}</span>
                      <StarRating rating={review.rating} />
                    </div>
                    <CardDescription>{new Date(review.createdAt).toLocaleDateString("pt-BR")}</CardDescription>
                  </CardHeader>
                  {review.comment && (
                    <CardContent className="px-3">
                      <p className="text-muted-foreground italic">"{review.comment}"</p>
                    </CardContent>
                  )}
                </Card>
              )}
            </>
          ))}
        </div>

        {/* ✅ LÓGICA ATUALIZADA PARA O FORMULÁRIO */}
        {isAuthenticated ? (
          hasUserReviewed ? (
            // ✅ Mensagem quando já avaliou
            <div className="text-center p-6 border-2 border-dashed rounded-lg bg-green-50 border-green-200">
              <div className="flex flex-col items-center space-y-2">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <p className="text-green-800 font-medium">Obrigado pela sua avaliação!</p>
                <p className="text-green-600 text-sm">Você já enviou uma avaliação para barbearia.</p>
              </div>
            </div>
          ) : (
            // ✅ Formulário quando ainda não avaliou
            <div>
              <CardTitle className="mb-4">Deixe sua avaliação</CardTitle>
              <div>
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div className="flex flex-col">
                    <StarRating rating={myRating} setRating={setMyRating} interactive />
                  </div>
                  <div>
                    <Label htmlFor="comment">Seu comentário (opcional)</Label>
                    <Textarea
                      id="comment"
                      value={myComment}
                      onChange={(e) => setMyComment(e.target.value)}
                      placeholder="Conte como foi sua experiência..."
                      className="mt-1"
                    />
                  </div>
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enviar Avaliação
                  </Button>
                </form>
              </div>
            </div>
          )
        ) : (
          <div className="text-center p-4 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">
              <Link to="/entrar" className="font-bold text-[var(--loja-theme-color)] underline">
                Faça seu login
              </Link>{" "}
              para deixar uma avaliação.
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
