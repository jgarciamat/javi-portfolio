import { createHash, randomBytes } from 'crypto';
import { ConflictError, NotFoundError } from '@domain/errors';
import { HouseholdRepository, UserRepository } from '@domain/ports/repositories';
import { Clock } from '@domain/ports/services';
import { EntitlementService } from '@application/billing/EntitlementService';

/** People who can join an owner's household (a couple: owner + one member). */
export const HOUSEHOLD_MAX_MEMBERS = 1;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const hash = (code: string): string => createHash('sha256').update(code.trim()).digest('hex');

export interface HouseholdMember {
  id: string;
  name: string;
}

export interface HouseholdStatus {
  role: 'owner' | 'member' | 'none';
  /** The household the user works in, when they are a member. */
  owner: HouseholdMember | null;
  members: HouseholdMember[];
  /** Invitation waiting to be used (the code itself is only shown when it is created). */
  pendingInvite: { expiresAt: string } | null;
  maxMembers: number;
}

/** Lets two people work on the same data without ever mixing it up with anyone else's. */
export class HouseholdService {
  constructor(
    private readonly household: HouseholdRepository,
    private readonly users: UserRepository,
    private readonly entitlements: EntitlementService,
    private readonly clock: Clock
  ) {}

  /** Owner of the data the user works on: themselves, or the owner of the household they joined. */
  dataOwner(userId: string): string {
    return this.household.ownerOf(userId) ?? userId;
  }

  private person(userId: string): HouseholdMember {
    return { id: userId, name: this.users.findById(userId)?.name ?? '' };
  }

  status(userId: string): HouseholdStatus {
    const ownerId = this.household.ownerOf(userId);
    if (ownerId) {
      return {
        role: 'member',
        owner: this.person(ownerId),
        members: [],
        pendingInvite: null,
        maxMembers: HOUSEHOLD_MAX_MEMBERS,
      };
    }
    const members = this.household.membersOf(userId).map((m) => this.person(m.memberId));
    const invite = this.household.pendingInvite(userId);
    const valid = invite && new Date(invite.expiresAt) > this.clock.now() ? invite : null;
    return {
      role: members.length > 0 ? 'owner' : 'none',
      owner: null,
      members,
      pendingInvite: valid ? { expiresAt: valid.expiresAt } : null,
      maxMembers: HOUSEHOLD_MAX_MEMBERS,
    };
  }

  /** New one-time code that lets one person join; any previous invitation stops working. */
  invite(ownerId: string): { code: string; expiresAt: string } {
    this.entitlements.assertFeature(ownerId, 'household');
    if (this.household.ownerOf(ownerId)) {
      throw new ConflictError('Ya formas parte del hogar de otra persona', 'HOUSEHOLD_IS_MEMBER');
    }
    if (this.household.membersOf(ownerId).length >= HOUSEHOLD_MAX_MEMBERS) {
      throw new ConflictError('Tu hogar ya está completo', 'HOUSEHOLD_FULL');
    }
    const now = this.clock.now();
    const code = randomBytes(18).toString('base64url');
    const expiresAt = new Date(now.getTime() + INVITE_TTL_MS).toISOString();
    this.household.saveInvite(ownerId, hash(code), now.toISOString(), expiresAt);
    return { code, expiresAt };
  }

  cancelInvite(ownerId: string): void {
    this.household.deleteInvite(ownerId);
  }

  private validInvite(code: string): { ownerId: string; expiresAt: string } {
    const invite = this.household.findInvite(hash(code));
    if (!invite || new Date(invite.expiresAt) <= this.clock.now()) {
      throw new NotFoundError(
        'La invitación no es válida o ha caducado',
        'HOUSEHOLD_INVALID_INVITE'
      );
    }
    return invite;
  }

  /** Who is inviting, so the person can decide before joining. */
  preview(code: string): { owner: HouseholdMember; expiresAt: string } {
    const invite = this.validInvite(code);
    return { owner: this.person(invite.ownerId), expiresAt: invite.expiresAt };
  }

  join(userId: string, code: string): void {
    const invite = this.validInvite(code);
    if (invite.ownerId === userId) {
      throw new ConflictError('No puedes unirte a tu propio hogar', 'HOUSEHOLD_OWN_INVITE');
    }
    if (this.household.ownerOf(userId)) {
      throw new ConflictError('Ya formas parte de un hogar', 'HOUSEHOLD_ALREADY_MEMBER');
    }
    if (this.household.membersOf(userId).length > 0) {
      throw new ConflictError('Ya compartes tus datos con otra persona', 'HOUSEHOLD_HAS_MEMBERS');
    }
    if (this.household.ownerOf(invite.ownerId)) {
      throw new NotFoundError(
        'La invitación no es válida o ha caducado',
        'HOUSEHOLD_INVALID_INVITE'
      );
    }
    if (this.household.membersOf(invite.ownerId).length >= HOUSEHOLD_MAX_MEMBERS) {
      throw new ConflictError('Este hogar ya está completo', 'HOUSEHOLD_FULL');
    }
    this.household.addMember(userId, invite.ownerId, this.clock.now().toISOString());
    this.household.deleteInvite(invite.ownerId);
  }

  /** A member goes back to their own data. */
  leave(memberId: string): void {
    if (!this.household.removeMember(memberId)) {
      throw new NotFoundError('No formas parte de ningún hogar', 'HOUSEHOLD_NOT_MEMBER');
    }
  }

  /** The owner stops sharing with a member. */
  remove(ownerId: string, memberId: string): void {
    const isTheirs = this.household.membersOf(ownerId).some((m) => m.memberId === memberId);
    if (!isTheirs)
      throw new NotFoundError('Esa persona no está en tu hogar', 'HOUSEHOLD_NOT_MEMBER');
    this.household.removeMember(memberId);
  }
}
