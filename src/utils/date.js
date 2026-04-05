export function getRunOutDate(item) {
  if (!item.last_purchase || !item.days_supply) return null;

  const start = new Date(item.last_purchase);
  if (isNaN(start)) return null;

  const result = new Date(start);
  result.setDate(result.getDate() + Number(item.days_supply));

  const daysLeft = Math.ceil((result - new Date()) / (1000 * 60 * 60 * 24));

  return {
    date: result.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    daysLeft,
  };
}
