import type { Participant, PaymentGroup } from "@/db/schema";

/** A settling entity: a payment group's shared wallet, or a solo participant. */
export interface SettleEntity {
  key: string;
  name: string;
  memberIds: number[];
  memberNames: string[];
  /** Participant id used when recording a settlement for this entity. */
  representativeId: number;
}

export function buildEntities(participants: Participant[], groups: PaymentGroup[]) {
  const entities: SettleEntity[] = [];
  const keyByParticipant = new Map<number, string>();

  for (const group of groups) {
    const members = participants.filter((p) => p.paymentGroupId === group.id);
    if (members.length === 0) continue;
    const key = `g:${group.id}`;
    entities.push({
      key,
      name: group.name,
      memberIds: members.map((m) => m.id),
      memberNames: members.map((m) => m.name),
      representativeId: Math.min(...members.map((m) => m.id)),
    });
    for (const m of members) keyByParticipant.set(m.id, key);
  }

  for (const p of participants) {
    if (keyByParticipant.has(p.id)) continue;
    const key = `p:${p.id}`;
    entities.push({
      key,
      name: p.name,
      memberIds: [p.id],
      memberNames: [p.name],
      representativeId: p.id,
    });
    keyByParticipant.set(p.id, key);
  }

  const byKey = new Map(entities.map((e) => [e.key, e]));
  const entityOf = (participantId: number) => keyByParticipant.get(participantId)!;
  /** Display name of the wallet a participant settles through. */
  const walletNameOf = (participantId: number) =>
    byKey.get(keyByParticipant.get(participantId) ?? "")?.name ?? "?";

  return { entities, byKey, entityOf, walletNameOf };
}
