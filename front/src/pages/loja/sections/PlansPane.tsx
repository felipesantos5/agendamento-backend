import { PlansList } from "@/components/PlansList";
import { AnimatePresence, motion } from "framer-motion";

interface PlansPaneProps {
  barbershopId: string;
  barbershopSlug: string;
}

const sectionAnimation = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
  transition: { duration: 0.3, ease: "easeInOut" },
};

export function PlansPane({ barbershopId, barbershopSlug }: PlansPaneProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="services"
        initial={sectionAnimation.initial}
        animate={sectionAnimation.animate}
        exit={sectionAnimation.exit}
        className="p-6 sm:p-8 space-y-4"
      >
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900">Nossos Planos e Pacotes</h2>
        </div>

        <PlansList barbershopId={barbershopId} barbershopSlug={barbershopSlug} />
      </motion.div>
    </AnimatePresence>
  );
}
