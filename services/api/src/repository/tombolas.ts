import {
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';
import type { CreateTombolaInput, UpdateTombolaInput, Tombola, NumberCell, TombolaStatus } from '@tombola/shared';
import { ddb, TABLE_NAME } from '../lib/dynamo';

const VISIBLE_STATUSES: TombolaStatus[] = ['upcoming', 'active', 'finished'];

function pad(n: number): string {
  return String(n).padStart(3, '0');
}

function metaKey(id: string) {
  return { PK: `TOMBOLA#${id}`, SK: `TOMBOLA#${id}` };
}

/** GSI1 keys for status listing; null when the tombola should not appear in any listing. */
function listingKeys(status: TombolaStatus, sortAt: string, id: string, deleted: boolean) {
  if (deleted) return {};
  return { GSI1PK: `TOMBOLA#STATUS#${status}`, GSI1SK: `${sortAt}#${id}` };
}

function toTombola(item: Record<string, unknown>): Tombola {
  const { PK, SK, GSI1PK, GSI1SK, deletedAt, ...rest } = item;
  void PK;
  void SK;
  void GSI1PK;
  void GSI1SK;
  void deletedAt;
  return rest as unknown as Tombola;
}

export async function createTombola(input: CreateTombolaInput, createdBy: string): Promise<Tombola> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const sortAt = input.openAt ?? now;
  const tombola: Tombola = {
    tombolaId: id,
    title: input.title,
    description: input.description,
    status: input.status,
    gridSize: input.gridSize,
    pricePerNumber: input.pricePerNumber,
    currency: input.currency,
    prizeAmount: input.prizeAmount,
    prizeDescription: input.prizeDescription,
    whishNumberOverride: input.whishNumberOverride,
    reservationWindowMinutes: input.reservationWindowMinutes,
    drawPoolMode: input.drawPoolMode,
    openAt: input.openAt,
    drawAt: input.drawAt,
    createdBy,
    createdAt: now,
  };

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...metaKey(id),
        ...listingKeys(input.status, sortAt, id, false),
        ...tombola,
      },
    }),
  );

  await seedNumbers(id, input.gridSize);
  return tombola;
}

/** Seeds gridSize number items in batches of 25 (BatchWrite limit). Labels default to the number. */
export async function seedNumbers(
  tombolaId: string,
  gridSize: number,
  labels?: Record<number, { labelEn: string; labelAr: string }>,
): Promise<void> {
  const items: NumberCell[] = [];
  for (let n = 1; n <= gridSize; n++) {
    items.push({
      tombolaId,
      number: n,
      labelEn: labels?.[n]?.labelEn ?? String(n),
      labelAr: labels?.[n]?.labelAr ?? String(n),
      state: 'available',
    });
  }
  for (let i = 0; i < items.length; i += 25) {
    const batch = items.slice(i, i + 25);
    await ddb.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: batch.map((cell) => ({
            PutRequest: {
              Item: { PK: `TOMBOLA#${tombolaId}`, SK: `NUMBER#${pad(cell.number)}`, ...cell },
            },
          })),
        },
      }),
    );
  }
}

export async function getTombola(id: string): Promise<Tombola | null> {
  const res = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: metaKey(id) }));
  if (!res.Item || res.Item.deletedAt) return null;
  return toTombola(res.Item);
}

export async function listNumbers(tombolaId: string): Promise<NumberCell[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `TOMBOLA#${tombolaId}`, ':sk': 'NUMBER#' },
    }),
  );
  return (res.Items ?? []).map((i) => {
    const { PK, SK, ...rest } = i;
    void PK;
    void SK;
    return rest as unknown as NumberCell;
  });
}

async function listByStatus(status: TombolaStatus): Promise<Tombola[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': `TOMBOLA#STATUS#${status}` },
    }),
  );
  return (res.Items ?? []).map(toTombola);
}

/** Public listing: only visible statuses (never draft/cancelled/deleted). */
export async function listVisibleTombolas(): Promise<Record<string, Tombola[]>> {
  const groups = await Promise.all(VISIBLE_STATUSES.map((s) => listByStatus(s)));
  const out: Record<string, Tombola[]> = {};
  VISIBLE_STATUSES.forEach((s, i) => {
    out[s] = groups[i]!;
  });
  return out;
}

/** Admin listing: every status that carries GSI1 keys (i.e. all non-deleted). */
export async function listAllTombolas(): Promise<Tombola[]> {
  const statuses: TombolaStatus[] = ['draft', 'upcoming', 'active', 'closed', 'finished', 'cancelled'];
  const groups = await Promise.all(statuses.map((s) => listByStatus(s)));
  return groups.flat();
}

export async function updateTombola(id: string, input: UpdateTombolaInput): Promise<Tombola | null> {
  const existing = await getTombola(id);
  if (!existing) return null;
  const merged: Tombola = { ...existing, ...input };
  const sortAt = merged.openAt ?? merged.createdAt;
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...metaKey(id),
        ...listingKeys(merged.status, sortAt, id, false),
        ...merged,
      },
    }),
  );
  return merged;
}

export async function softDeleteTombola(id: string): Promise<boolean> {
  const existing = await getTombola(id);
  if (!existing) return false;
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: metaKey(id),
      UpdateExpression: 'SET deletedAt = :d REMOVE GSI1PK, GSI1SK',
      ExpressionAttributeValues: { ':d': new Date().toISOString() },
    }),
  );
  return true;
}

export async function duplicateTombola(id: string, createdBy: string): Promise<Tombola | null> {
  const source = await getTombola(id);
  if (!source) return null;
  const numbers = await listNumbers(id);
  const created = await createTombola(
    {
      title: source.title,
      description: source.description,
      gridSize: source.gridSize,
      pricePerNumber: source.pricePerNumber,
      currency: source.currency,
      prizeAmount: source.prizeAmount,
      prizeDescription: source.prizeDescription,
      whishNumberOverride: source.whishNumberOverride,
      reservationWindowMinutes: source.reservationWindowMinutes,
      drawPoolMode: source.drawPoolMode,
      status: 'draft',
    },
    createdBy,
  );
  // Copy any customized labels onto the freshly seeded numbers.
  const labels: Record<number, { labelEn: string; labelAr: string }> = {};
  for (const n of numbers) labels[n.number] = { labelEn: n.labelEn, labelAr: n.labelAr };
  await seedNumbers(created.tombolaId, created.gridSize, labels);
  return created;
}

export async function updateNumberLabel(
  tombolaId: string,
  n: number,
  labelEn: string,
  labelAr: string,
): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `TOMBOLA#${tombolaId}`, SK: `NUMBER#${pad(n)}` },
      UpdateExpression: 'SET labelEn = :en, labelAr = :ar',
      ExpressionAttributeValues: { ':en': labelEn, ':ar': labelAr },
    }),
  );
}
