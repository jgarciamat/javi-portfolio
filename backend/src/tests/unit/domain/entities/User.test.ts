import { User, UserProps } from '@domain/entities/User';

const baseProps: UserProps = {
    id: 'user-id-001',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    name: 'Test User',
    createdAt: new Date('2024-01-01'),
    emailVerified: false,
    verificationToken: 'token-abc',
};

describe('User entity', () => {
    describe('create', () => {
        it('should create a valid user', () => {
            const user = User.create(baseProps);
            expect(user.id).toBe('user-id-001');
            expect(user.email).toBe('test@example.com');
            expect(user.name).toBe('Test User');
            expect(user.emailVerified).toBe(false);
            expect(user.verificationToken).toBe('token-abc');
        });

        it('should throw when email is empty', () => {
            expect(() => User.create({ ...baseProps, email: '' })).toThrow('Email o usuario requerido');
        });

        it('should allow emailVerified=true', () => {
            const user = User.create({ ...baseProps, emailVerified: true, verificationToken: null });
            expect(user.emailVerified).toBe(true);
            expect(user.verificationToken).toBeNull();
        });
    });

    describe('verify', () => {
        it('should return a new verified user with no token', () => {
            const user = User.create(baseProps);
            const verified = user.verify();
            expect(verified.emailVerified).toBe(true);
            expect(verified.verificationToken).toBeNull();
        });

        it('should not mutate the original user', () => {
            const user = User.create(baseProps);
            user.verify();
            expect(user.emailVerified).toBe(false);
        });
    });

    describe('toJSON', () => {
        it('should return public fields only', () => {
            const user = User.create(baseProps);
            const json = user.toJSON();
            expect(json).toEqual({ id: 'user-id-001', email: 'test@example.com', name: 'Test User', avatarUrl: null });
            expect(Object.keys(json)).not.toContain('passwordHash');
        });
    });
});
