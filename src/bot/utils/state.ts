// Keys are chatId strings, values are step identifiers.
//
// Admin step format:
//   "ADMIN_AWAITING_USER_SEARCH"           — waiting for user search query
//   "ADMIN_AWAITING_ORDER_SEARCH"          — waiting for order ID
//   "ADMIN_AWAITING_BROADCAST"             — waiting for broadcast message text
//   "ADMIN_AWAITING_TOPUP_AMOUNT:{userId}" — waiting for manual topup amount

export const userSteps = new Map<string, string>();