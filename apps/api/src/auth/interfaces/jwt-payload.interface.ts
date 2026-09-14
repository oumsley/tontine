export interface JwtPayload {
  sub: string;
  phoneNumber: string;
  jti?: string;
}
