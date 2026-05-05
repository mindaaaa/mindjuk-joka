const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7일

export class RefreshTokenStore {
  async store(
    refreshToken: string,
    userId: number,
    kv: KVNamespace,
  ): Promise<void> {
    await kv.put(`refresh:${refreshToken}`, JSON.stringify({ userId }), {
      expirationTtl: REFRESH_TOKEN_TTL_SECONDS,
    });
  }

  async validate(
    refreshToken: string,
    kv: KVNamespace,
  ): Promise<number | null> {
    const value = await kv.get(`refresh:${refreshToken}`);
    if (!value) return null;

    const parsed = JSON.parse(value) as { userId: number };
    return parsed.userId;
  }

  async revoke(refreshToken: string, kv: KVNamespace): Promise<void> {
    await kv.delete(`refresh:${refreshToken}`);
  }
}
