// src/components/RippleButton.tsx

import React, { useRef } from "react";

type RippleButtonProps = React.ComponentPropsWithoutRef<"button">;

const RippleButton = ({ children, className, ...props }: RippleButtonProps) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    button.style.setProperty("--x", `${x}px`);
    button.style.setProperty("--y", `${y}px`);
  };

  return (
    <button
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      {...props}
      className={`
        relative overflow-hidden group
        ${className || ""} 
      `}
    >
      <span
        className="
          absolute top-[var(--y)] left-[var(--x)]
          w-1 h-1
          bg-white
          rounded-full
          transform -translate-x-1/2 -translate-y-1/2
          scale-0
          
          // AQUI ESTÁ A MUDANÇA: Duração maior e aceleração mais suave.
          transition-transform duration-1000 ease-in-out
          
          group-hover:scale-[250]
        "
      />
      <span className="relative z-10">{children}</span>
    </button>
  );
};

export default RippleButton;
