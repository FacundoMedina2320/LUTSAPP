export const ADMIN_USER_ID = process.env.EXPO_PUBLIC_ADMIN_USER_ID ?? "";

export const isAdminUser = (userId?: string | null) => Boolean(userId && userId === ADMIN_USER_ID);
