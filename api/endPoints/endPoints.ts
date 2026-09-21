export const endpoints = {
  auth: { login: '/auth/login', registerSeller: '/auth/register-seller', refresh: '/auth/refresh', logout: '/auth/logout', verifyOtp: '/auth/verify-otp', forgotPassword: '/auth/forgot-password', resetPassword: '/auth/reset-password' },
  users: { me: '/users/me', changePassword: '/users/change-password' },
  vendors: { me: '/vendors/me', orders: '/vendors/orders', verification: '/vendors/me/verification', documents: '/vendors/documents', bankAccount: '/vendors/bank-account' },
  products: { base: '/vendor/products', categories: '/categories', brands: '/brands' },
  inventory: '/vendor/inventory',
  orders: '/vendors/orders',
  finance: '/vendor/finance',
  reviews: '/reviews/vendor',
  notifications: '/notifications',
  verification: '/vendors/me/verification',
  dashboard: '/vendor/dashboard',
  support: { tickets: '/support/tickets' },
} as const
