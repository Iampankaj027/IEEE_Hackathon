/**
 * Credit Points Matrix
 * Calculates points automatically based on Event Scope + Student's Participation Role
 */

const ROLE_BASE_POINTS = {
  WINNER_1ST: 25,
  WINNER_2ND: 20,
  WINNER_3RD: 15,
  FINALIST: 12,
  ORGANIZER: 15,
  VOLUNTEER: 8,
  PARTICIPANT: 5,
};

const SCOPE_MULTIPLIER = {
  INTRA_COLLEGE: 1.0,   // e.g., College club event participant = 5 * 1.0 = 5 pts
  INTER_COLLEGE: 1.5,   // e.g., Inter-college winner = 25 * 1.5 = 38 pts
  STATE: 2.0,
  NATIONAL: 2.5,        // e.g., SIH Winner = 25 * 2.5 = 63 pts
  INTERNATIONAL: 3.0,
};

/**
 * Calculates credit points for a single verified certificate
 */
function calculateCertificatePoints(eventScope, participationRole) {
  const base = ROLE_BASE_POINTS[participationRole] || 5;
  const multiplier = SCOPE_MULTIPLIER[eventScope] || 1.0;
  return Math.round(base * multiplier);
}

/**
 * Calculates recommended marks for Faculty Grading Portal
 * @param {number} studentPoints - Total credit points earned by student
 * @param {number} maxMarks - Maximum marks faculty wants to allot (e.g., 20)
 * @param {number} targetPointsForFullMarks - Points needed for 100% marks (e.g., 60)
 * @param {number} baseMinimumMarks - Minimum marks given even with 0 points (optional)
 */
function calculateRecommendedMarks(
  studentPoints,
  maxMarks = 20,
  targetPointsForFullMarks = 60,
  baseMinimumMarks = 0
) {
  if (studentPoints <= 0) return baseMinimumMarks;
  const rawMarks = (studentPoints / targetPointsForFullMarks) * maxMarks;
  const roundedMarks = Math.ceil(rawMarks);
  return Math.min(maxMarks, Math.max(baseMinimumMarks, roundedMarks));
}

module.exports = {
  ROLE_BASE_POINTS,
  SCOPE_MULTIPLIER,
  calculateCertificatePoints,
  calculateRecommendedMarks,
};