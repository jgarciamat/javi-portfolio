import { CustomAlert } from '@domain/entities/CustomAlert';
import { ICustomAlertRepository } from '@domain/repositories/ICustomAlertRepository';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateCustomAlertDTO {
    userId: string;
    name: string;
    metric: string;
    operator: string;
    threshold: number;
    category?: string | null;
    active?: boolean;
}

export interface UpdateCustomAlertDTO {
    name?: string;
    metric?: string;
    operator?: string;
    threshold?: number;
    category?: string | null;
    active?: boolean;
}

// ─── Use Cases ────────────────────────────────────────────────────────────────

export class CreateCustomAlert {
    constructor(private readonly repo: ICustomAlertRepository) { }

    async execute(dto: CreateCustomAlertDTO): Promise<CustomAlert> {
        const alert = CustomAlert.create(dto);
        this.repo.save(alert);
        return alert;
    }
}

export class GetCustomAlerts {
    constructor(private readonly repo: ICustomAlertRepository) { }

    async execute(userId: string): Promise<CustomAlert[]> {
        return this.repo.findByUserId(userId);
    }
}

export class UpdateCustomAlert {
    constructor(private readonly repo: ICustomAlertRepository) { }

    async execute(id: string, changes: UpdateCustomAlertDTO): Promise<CustomAlert | null> {
        return this.repo.update(id, changes);
    }
}

export class DeleteCustomAlert {
    constructor(private readonly repo: ICustomAlertRepository) { }

    async execute(id: string): Promise<void> {
        this.repo.delete(id);
    }
}
