export interface UserProps {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    createdAt: Date;
    emailVerified: boolean;
    verificationToken: string | null;
}

export class User {
    private constructor(private readonly props: UserProps) { }

    static create(props: UserProps): User {
        if (!props.email) {
            throw new Error('Email o usuario requerido');
        }
        return new User(props);
    }

    get id(): string { return this.props.id; }
    get email(): string { return this.props.email; }
    get passwordHash(): string { return this.props.passwordHash; }
    get name(): string { return this.props.name; }
    get createdAt(): Date { return this.props.createdAt; }
    get emailVerified(): boolean { return this.props.emailVerified; }
    get verificationToken(): string | null { return this.props.verificationToken; }

    verify(): User {
        return User.create({ ...this.props, emailVerified: true, verificationToken: null });
    }

    toJSON(): { id: string; email: string; name: string } {
        return { id: this.props.id, email: this.props.email, name: this.props.name };
    }
}
