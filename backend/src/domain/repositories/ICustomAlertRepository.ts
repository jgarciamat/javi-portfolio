import { CustomAlert } from '../entities/CustomAlert';

export interface ICustomAlertRepository {
    save(alert: CustomAlert): void;
    findById(id: string): CustomAlert | null;
    findByUserId(userId: string): CustomAlert[];
    update(id: string, changes: Partial<{
        name: string;
        metric: string;
        operator: string;
        threshold: number;
        category: string | null;
        active: boolean;
    }>): CustomAlert | null;
    delete(id: string): void;
    deleteAllByUser(userId: string): void;
}
