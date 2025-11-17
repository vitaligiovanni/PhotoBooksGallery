// Type declarations for Express Request extensions

declare namespace Express {
  interface Request {
    user?: {
      claims: {
        sub: string;
      };
      isAuthenticated(): boolean;
      userData?: any;
    };
  }
}