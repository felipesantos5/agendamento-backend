// Esta é a nossa paleta com 10 cores distintas e agradáveis.
const BARBER_COLORS = [
  "#1f77b4", // Azul
  "#ff7f0e", // Laranja
  "#2ca02c", // Verde
  "#d62728", // Vermelho
  "#9467bd", // Roxo
  "#8c564b", // Marrom
  "#e377c2", // Rosa
  "#7f7f7f", // Cinza
  "#bcbd22", // Oliva
  "#17becf", // Ciano
];

/**
 * Atribui uma cor consistente para um barbeiro com base no seu ID.
 * @param barberId O ID do barbeiro.
 * @returns Uma cor em formato hexadecimal (ex: '#1f77b4').
 */
export const getColorForBarberId = (barberId?: string): string => {
  // Se não houver ID, retorna uma cor padrão.
  if (!barberId) {
    return "#333333"; // Um cinza escuro
  }

  // "Transforma" o ID de texto em um número.
  // Somamos os valores de cada caractere do ID.
  let sum = 0;
  for (let i = 0; i < barberId.length; i++) {
    sum += barberId.charCodeAt(i);
  }

  // Usamos o resto da divisão (%) para garantir que o índice sempre
  // esteja dentro do tamanho do nosso array de cores.
  const index = sum % BARBER_COLORS.length;

  return BARBER_COLORS[index];
};
