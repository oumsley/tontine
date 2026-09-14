export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(amount).replace(/ /g, " ");
}
