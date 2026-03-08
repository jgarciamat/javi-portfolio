export type DeleteScope = 'none' | 'from_current' | 'all';

export type VisibleScope = 'from_current' | 'all';

export interface DeleteRuleModalProps {
    ruleName: string;
    onConfirm: (scope: DeleteScope) => void;
    onCancel: () => void;
    loading?: boolean;
}
