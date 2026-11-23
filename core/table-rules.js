export const TableRules = Object.freeze({
  sector: 18,
  colors: ['الزمرد', 'الياقوت', 'الفيروز', 'العنبر', 'الجمشت', 'المرجان'],
  partner: (seat, seats) => (seat + seats / 2) % seats,
  trackLength: (seats) => seats * 18,
});
