import express from 'express';
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

import { AuthController } from '@infrastructure/controllers/AuthController';
import { TransactionController } from '@infrastructure/controllers/TransactionController';
import { CategoryController } from '@infrastructure/controllers/CategoryController';
import { BudgetController } from '@infrastructure/controllers/BudgetController';
import { authMiddleware } from '@infrastructure/express/authMiddleware';
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
async function seedAdmin() {
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
        console.log('✅ Admin user created: admin@admin.com / admin');
    }

    // Always ensure admin has categories (seed if missing — INSERT OR IGNORE is idempotent)
    categoryRepo.seedForUser(ADMIN_ID);
    const catCount = (db.prepare('SELECT COUNT(*) as n FROM categories WHERE user_id = ?').get(ADMIN_ID) as any).n;
    if (catCount > 0) {
        console.log(`✅ Admin categories ready (${catCount})`);
    }
}
seedAdmin().catch(console.error);

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

// --- Routes ---
const router = express.Router();

// Public
router.post('/auth/register', (req, res) => authController.register(req, res));
router.post('/auth/login', (req, res) => authController.login(req, res));
router.get('/auth/verify-email', (req, res) => authController.verify(req, res));
router.get('/health', (_req, res) => res.json({ status: 'ok', app: 'money-manager-api' }));

// Protected
router.use(authMiddleware as any);

// IMPORTANT: specific routes before parameterized ones
router.get('/transactions/summary', (req, res) => transactionController.summary(req as any, res));
router.get('/transactions/annual/:year', (req, res) => transactionController.annual(req as any, res));
router.get('/transactions', (req, res) => transactionController.getAll(req as any, res));
router.post('/transactions', (req, res) => transactionController.create(req as any, res));
router.delete('/transactions/:id', (req, res) => transactionController.delete(req as any, res));

router.get('/categories', (req, res) => categoryController.getAll(req as any, res));
router.post('/categories', (req, res) => categoryController.create(req as any, res));
router.delete('/categories/:id', (req, res) => categoryController.delete(req as any, res));

router.get('/budget/history', (req, res) => budgetController.history(req as any, res));
router.get('/budget/carryover/:year/:month', (req, res) => budgetController.carryover(req as any, res));
router.get('/budget/:year/:month', (req, res) => budgetController.get(req as any, res));
router.put('/budget/:year/:month', (req, res) => budgetController.set(req as any, res));

app.use('/api', router);

app.listen(PORT, () => {
    console.log(`💰 Money Manager API running on http://localhost:${PORT}`);
});

export default app;

