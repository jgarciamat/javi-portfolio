import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import { getDb } from '@infrastructure/persistence/SqliteDb';
import { SqliteUserRepository } from '@infrastructure/persistence/SqliteUserRepository';
import { SqliteTransactionRepository } from '@infrastructure/persistence/SqliteTransactionRepository';
import { SqliteCategoryRepository } from '@infrastructure/persistence/SqliteCategoryRepository';
import { SqliteMonthlyBudgetRepository } from '@infrastructure/persistence/SqliteMonthlyBudgetRepository';

import { SqliteRefreshTokenRepository } from '@infrastructure/persistence/SqliteRefreshTokenRepository';
import { SqliteRecurringRuleRepository } from '@infrastructure/persistence/SqliteRecurringRuleRepository';
import { SqliteCustomAlertRepository } from '@infrastructure/persistence/SqliteCustomAlertRepository';

import { RegisterUser, LoginUser, VerifyEmail, LogoutUser, RefreshAccessToken, RequestPasswordReset, ResetPassword } from '@application/use-cases/Auth';
import { SetMonthlyBudget, GetMonthlyBudget } from '@application/use-cases/Budget';
import { UpdateName, UpdatePassword, UpdateAvatar } from '@application/use-cases/UpdateProfile';
import { DeleteAccount } from '@application/use-cases/DeleteAccount';
import { CreateRecurringRule, GetRecurringRules, UpdateRecurringRule, DeleteRecurringRule } from '@application/use-cases/RecurringRules';
import { CreateCustomAlert, GetCustomAlerts, UpdateCustomAlert, DeleteCustomAlert } from '@application/use-cases/CustomAlerts';

import { AuthController } from '@infrastructure/controllers/AuthController';
import { TransactionController } from '@infrastructure/controllers/TransactionController';
import { CategoryController } from '@infrastructure/controllers/CategoryController';
import { BudgetController } from '@infrastructure/controllers/BudgetController';
import { ProfileController } from '@infrastructure/controllers/ProfileController';
import { AlertController } from '@infrastructure/controllers/AlertController';
import { AIController } from '@infrastructure/controllers/AIController';
import { RecurringRuleController } from '@infrastructure/controllers/RecurringRuleController';
import { CustomAlertController } from '@infrastructure/controllers/CustomAlertController';
import { authMiddleware, AuthRequest } from '@infrastructure/express/authMiddleware';
import { EmailService } from '@infrastructure/email/EmailService';
import { CheckBudgetAlerts } from '@application/use-cases/CheckBudgetAlerts';
import { GetAIAdvice } from '@application/use-cases/GetAIAdvice';

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
const refreshTokenRepo = new SqliteRefreshTokenRepository(db);
const recurringRuleRepo = new SqliteRecurringRuleRepository(db);
const customAlertRepo = new SqliteCustomAlertRepository(db);

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
const loginUser = new LoginUser(userRepo, refreshTokenRepo);
const verifyEmail = new VerifyEmail(userRepo);
const logoutUser = new LogoutUser(refreshTokenRepo);
const refreshAccessToken = new RefreshAccessToken(refreshTokenRepo);
const setMonthlyBudget = new SetMonthlyBudget(budgetRepo);
const getMonthlyBudget = new GetMonthlyBudget(budgetRepo);

// --- New feature use-cases & services ---
const checkBudgetAlerts = new CheckBudgetAlerts(transactionRepo);
const getAIAdvice = new GetAIAdvice();
const requestPasswordReset = new RequestPasswordReset(userRepo, emailService);
const resetPassword = new ResetPassword(userRepo);

// --- Controllers ---
const authController = new AuthController(registerUser, loginUser, verifyEmail, logoutUser, refreshAccessToken, requestPasswordReset, resetPassword);
const transactionController = new TransactionController(transactionRepo);
const categoryController = new CategoryController(categoryRepo);
const budgetController = new BudgetController(setMonthlyBudget, getMonthlyBudget, transactionRepo);
const profileController = new ProfileController(
    new UpdateName(userRepo),
    new UpdatePassword(userRepo),
    new UpdateAvatar(userRepo),
    new DeleteAccount(userRepo, transactionRepo, categoryRepo, recurringRuleRepo, refreshTokenRepo),
);
const alertController = new AlertController(checkBudgetAlerts);
const aiController = new AIController(getAIAdvice, transactionRepo, budgetRepo);
const recurringRuleController = new RecurringRuleController(
    new CreateRecurringRule(recurringRuleRepo, transactionRepo),
    new GetRecurringRules(recurringRuleRepo, transactionRepo),
    new UpdateRecurringRule(recurringRuleRepo, transactionRepo),
    new DeleteRecurringRule(recurringRuleRepo, transactionRepo),
);
const customAlertController = new CustomAlertController(
    new CreateCustomAlert(customAlertRepo),
    new GetCustomAlerts(customAlertRepo),
    new UpdateCustomAlert(customAlertRepo),
    new DeleteCustomAlert(customAlertRepo),
);

// --- Routes ---
const router = express.Router();

// Public
router.post('/auth/register', (req: Request, res: Response) => authController.register(req, res));
router.post('/auth/login', (req: Request, res: Response) => authController.login(req, res));
router.post('/auth/refresh', (req: Request, res: Response) => authController.refresh(req, res));
router.get('/auth/verify-email', (req: Request, res: Response) => authController.verify(req, res));
router.post('/auth/forgot-password', (req: Request, res: Response) => authController.requestPasswordReset(req, res));
router.post('/auth/reset-password', (req: Request, res: Response) => authController.resetPassword(req, res));
router.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok', app: 'money-manager-api' }));

// Protected
router.use(authMiddleware);

router.post('/auth/logout', (req: Request, res: Response) => authController.logout(req, res));

// IMPORTANT: specific routes before parameterized ones
router.get('/transactions/summary', (req: Request, res: Response) => transactionController.summary(req as AuthRequest, res));
router.get('/transactions/annual/:year', (req: Request, res: Response) => transactionController.annual(req as AuthRequest, res));
router.get('/transactions', (req: Request, res: Response) => transactionController.getAll(req as AuthRequest, res));
router.post('/transactions', (req: Request, res: Response) => transactionController.create(req as AuthRequest, res));
router.patch('/transactions/:id', (req: Request, res: Response) => transactionController.patch(req as AuthRequest, res));
router.put('/transactions/:id', (req: Request, res: Response) => transactionController.update(req as AuthRequest, res));
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
router.delete('/profile/account', (req: Request, res: Response) => profileController.deleteAccount(req as AuthRequest, res));

// Alerts
router.get('/alerts/budget/:year/:month', (req: Request, res: Response) => alertController.budgetAlerts(req as AuthRequest, res));

// AI Advisor
router.post('/ai/advice', (req: Request, res: Response) => aiController.getAdvice(req as AuthRequest, res));

// Recurring rules
router.get('/recurring-rules', (req: Request, res: Response) => recurringRuleController.getAll(req as AuthRequest, res));
router.post('/recurring-rules', (req: Request, res: Response) => recurringRuleController.create(req as AuthRequest, res));
router.patch('/recurring-rules/:id', (req: Request, res: Response) => recurringRuleController.update(req as AuthRequest, res));
router.delete('/recurring-rules/:id', (req: Request, res: Response) => recurringRuleController.delete(req as AuthRequest, res));

// Custom alerts
router.get('/custom-alerts', (req: Request, res: Response) => customAlertController.getAll(req as AuthRequest, res));
router.post('/custom-alerts', (req: Request, res: Response) => customAlertController.create(req as AuthRequest, res));
router.patch('/custom-alerts/:id', (req: Request, res: Response) => customAlertController.update(req as AuthRequest, res));
router.delete('/custom-alerts/:id', (req: Request, res: Response) => customAlertController.delete(req as AuthRequest, res));

app.use('/api', router);

app.listen(PORT, () => {
    console.info(`💰 Money Manager API running on http://localhost:${PORT}`);
});

export default app;

