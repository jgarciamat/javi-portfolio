export interface RefreshTokenRecord {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
}

export interface IRefreshTokenRepository {
    save(record: RefreshTokenRecord): Promise<void>;
    findByToken(token: string): Promise<RefreshTokenRecord | null>;
    deleteByToken(token: string): Promise<void>;
    deleteByUserId(userId: string): Promise<void>;
    deleteExpired(): Promise<void>;
}
