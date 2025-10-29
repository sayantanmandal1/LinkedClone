// Debug utilities for development
export const debugLog = (context: string, data: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEBUG ${context}]:`, data);
  }
};

export const debugError = (context: string, error: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[ERROR ${context}]:`, error);
  }
};

export const debugUser = (user: any) => {
  debugLog('USER_DATA', {
    hasUser: !!user,
    userId: user?._id,
    userKeys: user ? Object.keys(user) : [],
    user: user
  });
};