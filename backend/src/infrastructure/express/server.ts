import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import { getDb } from '@infrastructure/persistence/SqliteDb';
import { SqliteUserRepository } from '@infrastructure/persistence/SqliteUserRepository';
import { SqliteTransactionRepository } from '@infrastructure/persistence/SqliteTransactionRepository';
import { SqliteCategoryRepository } from '@infrastructure/persistence/SqliteCategoryRepository';
import { SqliteMonthlyBudgetRepository } from '@infrastructure/persistence/SqliteMonthlyBudgetRepository';

import { RegisterUser, LoginUser, VerifyEmail } from '@application/use-cases/Auth';
import { SetMonthlyBudget, GetMonthlyBudget } from '@application/use-cases/Budget';
import { UpdateName, UpdatePassword, UpdateAvatar } from '@application/use-cases/UpdateProfile';

import { AuthController } from '@infrastructure/controllers/AuthController';
import { TransactionController } from '@infrastructure/controllers/TransactionController';
import { CategoryController } from '@infrastructure/controllers/CategoryController';
import { BudgetController } from '@infrastructure/controllers/BudgetController';
import { ProfileController } from '@infrastructure/controllers/ProfileController';
import { authMiddleware, AuthRequest } from '@infrastructure/express/authMiddleware';
import { EmailService } from '@infrastructure/email/EmailService';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

// --- DB & Repositories ---
const db = getDb();
const userRepo = new SqliteUserRepository(db);
const transactionRepo = new SqliteTransactionRepository(db);
const categoryRepo = new SqliteCategoryRepository(db);
const budgetRepo = new SqliteMonthlyBudgetRepository(db);

// --- Seed admin user (always exists, always has categories) ---
async function seedAdmin(): Promise<void> {
    const ADMIN_ID = 'admin-fixed-id-0000-0000-000000000001';
    const ADMIN_EMAIL = 'admin@admin.com';
    const ADMIN_PASS = 'admin';

    const existing = await userRepo.findById(ADMIN_ID);
    if (!existing) {
        const passwordHash = await bcrypt.hash(ADMIN_PASS, 10);
        db.prepare(`
            INSERT OR IGNORE INTO users (id, email, name, password_hash, created_at, email_verified, verification_token)
            VALUES (?, ?, 'Admin', ?, ?, 1, NULL)
        `).run(ADMIN_ID, ADMIN_EMAIL, passwordHash, new Date().toISOString());
    }

    // Always ensure admin has categories (INSERT OR IGNORE is idempotent)
    categoryRepo.seedForUser(ADMIN_ID);
}
seedAdmin().catch((err: unknown) => console.error('Seed error:', err));

// --- Services ---
const emailService = new EmailService();

// --- Use cases ---
const registerUser = new RegisterUser(userRepo, categoryRepo, emailService);
const loginUser = new LoginUser(userRepo);
const verifyEmail = new VerifyEmail(userRepo);
const setMonthlyBudget = new SetMonthlyBudget(budgetRepo);
const getMonthlyBudget = new GetMonthlyBudget(budgetRepo);

// --- Controllers ---
const authController = new AuthController(registerUser, loginUser, verifyEmail);
const transactionController = new TransactionController(transactionRepo);
const categoryController = new CategoryController(categoryRepo);
const budgetController = new BudgetController(setMonthlyBudget, getMonthlyBudget, transactionRepo);
const profileController = new ProfileController(
    new UpdateName(userRepo),
    new UpdatePassword(userRepo),
    new UpdateAvatar(userRepo),
);

// --- Routes ---
const router = express.Router();

// Public
router.post('/auth/register', (req: Request, res: Response) => authController.register(req, res));
router.post('/auth/login', (req: Request, res: Response) => authController.login(req, res));
router.get('/auth/verify-email', (req: Request, res: Response) => authController.verify(req, res));
router.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok', app: 'money-manager-api' }));

// Protected
router.use(authMiddleware);

// IMPORTANT: specific routes before parameterized ones
router.get('/transactions/summary', (req: Request, res: Response) => transactionController.summary(req as AuthRequest, res));
router.get('/transactions/annual/:year', (req: Request, res: Response) => transactionController.annual(req as AuthRequest, res));
router.get('/transactions', (req: Request, res: Response) => transactionController.getAll(req as AuthRequest, res));
router.post('/transactions', (req: Request, res: Response) => transactionController.create(req as AuthRequest, res));
router.delete('/transactions/:id', (req: Request, res: Response) => transactionController.delete(req as AuthRequest, res));

router.get('/categories', (req: Request, res: Response) => categoryController.getAll(req as AuthRequest, res));
router.post('/categories', (req: Request, res: Response) => categoryController.create(req as AuthRequest, res));
router.delete('/categories/:id', (req: Request, res: Response) => categoryController.delete(req as AuthRequest, res));

router.get('/budget/history', (req: Request, res: Response) => budgetController.history(req as AuthRequest, res));
router.get('/budget/carryover/:year/:month', (req: Request, res: Response) => budgetController.carryover(req as AuthRequest, res));
router.get('/budget/:year/:month', (req: Request, res: Response) => budgetController.get(req as AuthRequest, res));
router.put('/budget/:year/:month', (req: Request, res: Response) => budgetController.set(req as AuthRequest, res));

// Profile
router.patch('/profile/name', (req: Request, res: Response) => profileController.patchName(req as AuthRequest, res));
router.patch('/profile/password', (req: Request, res: Response) => profileController.patchPassword(req as AuthRequest, res));
router.patch('/profile/avatar', (req: Request, res: Response) => profileController.patchAvatar(req as AuthRequest, res));

app.use('/api', router);

app.listen(PORT, () => {
    console.info(`💰 Money Manager API running on http://localhost:${PORT}`);
});

export default app;

