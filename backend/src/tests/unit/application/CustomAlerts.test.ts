import {
    CreateCustomAlert,
    GetCustomAlerts,
    UpdateCustomAlert,
    DeleteCustomAlert,
} from '@application/use-cases/CustomAlerts';
import { ICustomAlertRepository } from '@domain/repositories/ICustomAlertRepository';
import { CustomAlert } from '@domain/entities/CustomAlert';

// ─── Mock repo factory ────────────────────────────────────────────────────────

function makeRepo(): jest.Mocked<ICustomAlertRepository> {
    return {
        save: jest.fn(),
        findById: jest.fn(),
        findByUserId: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteAllByUser: jest.fn(),
    };
}

function makeAlert(overrides: Partial<Parameters<typeof CustomAlert.create>[0]> = {}): CustomAlert {
    return CustomAlert.create({
        userId: 'u1',
        name: 'Gastos altos',
        metric: 'expenses_pct',
        operator: 'gte',
        threshold: 80,
        ...overrides,
    });
}

// ─── CreateCustomAlert ────────────────────────────────────────────────────────

describe('CreateCustomAlert', () => {
    it('creates and saves an alert', async () => {
        const repo = makeRepo();
        const useCase = new CreateCustomAlert(repo);
        const alert = await useCase.execute({
            userId: 'u1',
            name: 'Gastos altos',
            metric: 'expenses_pct',
            operator: 'gte',
            threshold: 80,
        });
        expect(alert.name).toBe('Gastos altos');
        expect(alert.threshold).toBe(80);
        expect(alert.active).toBe(true);
        expect(repo.save).toHaveBeenCalledWith(alert);
    });

    it('creates a category_pct alert with category', async () => {
        const repo = makeRepo();
        const useCase = new CreateCustomAlert(repo);
        const alert = await useCase.execute({
            userId: 'u1',
            name: 'Ocio excesivo',
            metric: 'category_pct',
            operator: 'gte',
            threshold: 20,
            category: 'Ocio',
        });
        expect(alert.category).toBe('Ocio');
        expect(repo.save).toHaveBeenCalledWith(alert);
    });

    it('propagates validation errors from entity', async () => {
        const repo = makeRepo();
        const useCase = new CreateCustomAlert(repo);
        await expect(useCase.execute({
            userId: 'u1',
            name: '',
            metric: 'expenses_pct',
            operator: 'gte',
            threshold: 80,
        })).rejects.toThrow('name cannot be empty');
        expect(repo.save).not.toHaveBeenCalled();
    });
});

// ─── GetCustomAlerts ──────────────────────────────────────────────────────────

describe('GetCustomAlerts', () => {
    it('returns all alerts for a user', async () => {
        const repo = makeRepo();
        const a1 = makeAlert();
        const a2 = makeAlert({ name: 'Balance bajo', metric: 'balance_amount', threshold: 100 });
        repo.findByUserId.mockReturnValue([a1, a2]);

        const useCase = new GetCustomAlerts(repo);
        const result = await useCase.execute('u1');

        expect(result).toHaveLength(2);
        expect(result[0]).toBe(a1);
        expect(result[1]).toBe(a2);
        expect(repo.findByUserId).toHaveBeenCalledWith('u1');
    });

    it('returns empty array when no alerts exist', async () => {
        const repo = makeRepo();
        repo.findByUserId.mockReturnValue([]);
        const result = await new GetCustomAlerts(repo).execute('u1');
        expect(result).toEqual([]);
    });
});

// ─── UpdateCustomAlert ────────────────────────────────────────────────────────

describe('UpdateCustomAlert', () => {
    it('updates an alert and returns the updated entity', async () => {
        const repo = makeRepo();
        const alert = makeAlert();
        const updated = alert.withProps({ threshold: 90 });
        repo.update.mockReturnValue(updated);

        const useCase = new UpdateCustomAlert(repo);
        const result = await useCase.execute(alert.id, { threshold: 90 });

        expect(repo.update).toHaveBeenCalledWith(alert.id, { threshold: 90 });
        expect(result?.threshold).toBe(90);
    });

    it('returns null when alert is not found', async () => {
        const repo = makeRepo();
        repo.update.mockReturnValue(null);

        const useCase = new UpdateCustomAlert(repo);
        const result = await useCase.execute('non-existent', { active: false });
        expect(result).toBeNull();
    });
});

// ─── DeleteCustomAlert ────────────────────────────────────────────────────────

describe('DeleteCustomAlert', () => {
    it('deletes an alert by id', async () => {
        const repo = makeRepo();
        const useCase = new DeleteCustomAlert(repo);
        await useCase.execute('some-id');
        expect(repo.delete).toHaveBeenCalledWith('some-id');
    });
});
