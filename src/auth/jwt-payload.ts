export type JwtPayload = {
  sub: number;
  userId: string;
  role: number;
  shopId: string | null;
};
