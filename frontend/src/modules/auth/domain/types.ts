// ─── Auth domain types ────────────────────────────────────────────────────────

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string | null;
}

export interface AuthResult {
    token: string;
    user: AuthUser;
}

export interface RegisterResult {
    message: string;
}

export interface LoginDTO {
    email: string;
    password: string;
}

export interface RegisterDTO {
    email: string;
    password: string;
    name: string;
}
