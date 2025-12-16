import { Button } from "@/components/ui/button";

// Tipos para as abas
type TabId = "agendamento" | "avaliacoes" | "planos" | "products";

export type Tab = {
  id: string;
  label: string;
};

interface CategoryTabsProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
  tabs: Tab[];
}

export function CategoryTabs({ activeTab, onTabChange, tabs }: CategoryTabsProps) {
  return (
    // Container que permite rolagem horizontal em telas pequenas
    <div className="border-b border-border overflow-x-auto">
      <div className="flex justify-center px-4" role="tablist">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            onClick={() => onTabChange(tab.id as TabId)}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`
              py-4 px-4 sm:px-6 rounded-none text-sm sm:text-base font-semibold transition-all
              ${
                activeTab === tab.id
                  ? "border-b-2 border-[var(--loja-theme-color)] text-[var(--loja-theme-color)]"
                  : "text-muted-foreground hover:text-foreground/80"
              }
            `}
          >
            {tab.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
