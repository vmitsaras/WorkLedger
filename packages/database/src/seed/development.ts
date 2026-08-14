import { fileURLToPath } from 'node:url';

import { and, count, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

import { mvpAbsenceTypePolicies } from '@workledger/domain';

import {
  absenceCoverageSegments,
  absenceDecisions,
  absenceEffects,
  absenceRequests,
  absenceTypes,
  accountEmployeeLinks,
  accountRoleAssignments,
  approvedMonthlySnapshots,
  authAccounts,
  authUsers,
  correctionDecisions,
  correctionRequests,
  dailyProjections,
  domainAuditEvents,
  employees,
  employmentPeriods,
  holidays,
  leaveEntitlementEntries,
  managerAssignments,
  monthlyPeriods,
  organizations,
  policyAssignments,
  postLockAdjustments,
  punchEvents,
  scheduleAssignments,
  securityAuditEvents,
  teamAssignments,
  teams,
  timeAccountEntries,
  timePolicies,
  attendanceHeads,
  weeklySchedules,
} from '../schema/index.js';
import * as schema from '../schema/index.js';

const { Pool } = pg;

export const DEVELOPMENT_SEED_ANCHOR_DATE = '2026-02-02' as const;
export const DEVELOPMENT_SEED_ORGANIZATION_ID = seedId(1);
const passwordHash =
  'f268c07ead39cbb8b7a600809a9b14f2:2a5a68e378cdb126c57300988cbaa9b7250df69a4551b8def46ab171c92f378678b8d3fa139bfb59588c64eef97facfd4f293a5b3bb83ccd366118cb2a1abaf7';
const createdAt = '2026-02-01T09:00:00.000Z';
const createdDate = new Date(createdAt);
const organizationId = DEVELOPMENT_SEED_ORGANIZATION_ID;

const personaDefinitions = Object.freeze([
  {
    active: true,
    email: 'emma@northstar.test',
    employeeNumber: 'NS-001',
    id: 10,
    name: 'Emma Reed',
  },
  {
    active: true,
    email: 'leon@northstar.test',
    employeeNumber: 'NS-002',
    id: 20,
    name: 'Leon Papas',
  },
  {
    active: true,
    email: 'sofia@northstar.test',
    employeeNumber: 'NS-003',
    id: 30,
    name: 'Sofia Marin',
  },
  {
    active: true,
    email: 'daniel@northstar.test',
    employeeNumber: 'NS-004',
    id: 40,
    name: 'Daniel Cole',
  },
  {
    active: true,
    email: 'mina@northstar.test',
    employeeNumber: 'NS-005',
    id: 50,
    name: 'Mina Georgiou',
  },
  {
    active: true,
    email: 'alex@northstar.test',
    employeeNumber: 'NS-006',
    id: 60,
    name: 'Alex Morgan',
  },
  {
    active: true,
    email: 'priya@northstar.test',
    employeeNumber: 'NS-007',
    id: 70,
    name: 'Priya Shah',
  },
  {
    active: true,
    email: 'nora@northstar.test',
    employeeNumber: 'NS-008',
    id: 80,
    name: 'Nora Blake',
  },
  {
    active: false,
    email: 'owen@northstar.test',
    employeeNumber: 'NS-009',
    id: 90,
    name: 'Owen Ford',
  },
] as const);

const technicalAccount = Object.freeze({
  active: true,
  email: 'sam@northstar.test',
  id: 100,
  name: 'Sam Rivera',
});

const employeeId = (persona: (typeof personaDefinitions)[number]) => seedId(persona.id + 1);
const accountId = (persona: (typeof personaDefinitions)[number]) => seedId(persona.id);

export type DevelopmentSeedEnvironment = 'development' | 'production' | 'test';
export type DevelopmentSeedResult = Readonly<{
  anchorDate: typeof DEVELOPMENT_SEED_ANCHOR_DATE;
  organizationId: string;
  personaCount: number;
  status: 'ALREADY_PRESENT' | 'CREATED';
}>;

export type DevelopmentSeedConfiguration = Readonly<{
  applyMigrations?: boolean;
  connectionString: string;
  environment: DevelopmentSeedEnvironment;
}>;

export class DevelopmentSeedError extends Error {
  readonly code = 'DEVELOPMENT_SEED_REJECTED';

  constructor(
    readonly reason:
      'DATABASE_NOT_EMPTY' | 'PRODUCTION_DISABLED' | 'SEED_DRIFT' | 'TARGET_NOT_LOCAL',
  ) {
    super(`Development seed rejected: ${reason}.`);
    this.name = 'DevelopmentSeedError';
  }
}

export async function seedDevelopmentDatabase(
  configuration: DevelopmentSeedConfiguration,
): Promise<DevelopmentSeedResult> {
  validateTarget(configuration);
  const pool = new Pool({
    application_name: 'workledger-development-seed',
    connectionString: configuration.connectionString,
    connectionTimeoutMillis: 5_000,
    max: 1,
  });
  const database = drizzle(pool, { schema });

  try {
    if (configuration.applyMigrations === true) {
      await migrate(database, {
        migrationsFolder: fileURLToPath(new URL('../../migrations', import.meta.url)),
      });
    }

    return await database.transaction(async (transaction) => {
      const [existingOrganization] = await transaction
        .select({
          id: organizations.id,
          name: organizations.name,
          timeZone: organizations.timeZone,
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);
      if (existingOrganization !== undefined) {
        await validateExistingSeed(transaction, existingOrganization);
        return seedResult('ALREADY_PRESENT');
      }

      const organizationCount = await transaction.select({ value: count() }).from(organizations);
      const accountCount = await transaction.select({ value: count() }).from(authUsers);
      if ((organizationCount[0]?.value ?? 0) !== 0 || (accountCount[0]?.value ?? 0) !== 0) {
        throw new DevelopmentSeedError('DATABASE_NOT_EMPTY');
      }

      await insertOrganizationAndPeople(transaction);
      await insertOrganizationConfiguration(transaction);
      await insertAttendanceAndCorrections(transaction);
      await insertAbsenceAndBalances(transaction);
      await insertPeriodsAndAudit(transaction);
      return seedResult('CREATED');
    });
  } finally {
    await pool.end();
  }
}

type SeedDatabase = NodePgDatabase<typeof schema>;
type SeedTransaction = Parameters<Parameters<SeedDatabase['transaction']>[0]>[0];

async function insertOrganizationAndPeople(transaction: SeedTransaction): Promise<void> {
  await transaction.insert(organizations).values({
    createdAt,
    id: organizationId,
    name: 'Northstar Studio',
    timeZone: 'Europe/Athens',
  });

  const allAccounts = [...personaDefinitions, technicalAccount];
  await transaction.insert(authUsers).values(
    allAccounts.map((persona) => ({
      active: persona.active,
      createdAt: createdDate,
      email: persona.email,
      emailVerified: true,
      id: seedId(persona.id),
      name: persona.name,
      updatedAt: createdDate,
    })),
  );
  await transaction.insert(authAccounts).values(
    allAccounts.map((persona) => ({
      accountId: seedId(persona.id),
      createdAt: createdDate,
      id: seedId(persona.id + 500),
      password: passwordHash,
      providerId: 'credential',
      updatedAt: createdDate,
      userId: seedId(persona.id),
    })),
  );

  await transaction.insert(employees).values(
    personaDefinitions.map((persona) => ({
      createdAt,
      displayName: persona.name,
      employeeNumber: persona.employeeNumber,
      id: employeeId(persona),
      organizationId,
      status: persona.active ? ('ACTIVE' as const) : ('INACTIVE' as const),
    })),
  );
  await transaction.insert(employmentPeriods).values(
    personaDefinitions.map((persona) => ({
      createdAt,
      employeeId: employeeId(persona),
      endsOn: persona.active ? null : '2026-02-01',
      id: seedId(persona.id + 600),
      organizationId,
      startsOn: '2025-01-01',
    })),
  );
  await transaction.insert(accountEmployeeLinks).values(
    personaDefinitions.map((persona) => ({
      employeeId: employeeId(persona),
      id: seedId(persona.id + 700),
      linkedAt: new Date('2025-01-01T00:00:00.000Z'),
      organizationId,
      unlinkedAt: persona.active ? null : new Date('2026-02-01T00:00:00.000Z'),
      userId: accountId(persona),
    })),
  );

  const roleRows: Array<typeof accountRoleAssignments.$inferInsert> = personaDefinitions.map(
    (persona) => ({
      assignedAt: new Date('2025-01-01T00:00:00.000Z'),
      id: seedId(persona.id + 800),
      organizationId,
      revokedAt: persona.active ? null : new Date('2026-02-01T00:00:00.000Z'),
      role: 'EMPLOYEE',
      userId: accountId(persona),
    }),
  );
  roleRows.push(
    role(seedId(861), accountId(personaDefinitions[5]), 'MANAGER'),
    role(seedId(871), accountId(personaDefinitions[6]), 'HR_ADMINISTRATOR'),
    role(seedId(881), accountId(personaDefinitions[7]), 'MANAGER'),
    role(seedId(901), seedId(technicalAccount.id), 'SYSTEM_ADMINISTRATOR'),
  );
  await transaction.insert(accountRoleAssignments).values(roleRows);

  await transaction.insert(teams).values([
    { createdAt, id: seedId(1000), name: 'Client Experience', organizationId },
    { createdAt, id: seedId(1001), name: 'Operations', organizationId },
  ]);
  await transaction.insert(teamAssignments).values(
    personaDefinitions.map((persona, index) => ({
      createdAt,
      employeeId: employeeId(persona),
      endsOn: persona.active ? null : '2026-02-01',
      id: seedId(1100 + index),
      organizationId,
      startsOn: '2025-01-01',
      teamId: index < 6 ? seedId(1000) : seedId(1001),
    })),
  );

  const alexEmployeeId = employeeId(personaDefinitions[5]);
  const noraEmployeeId = employeeId(personaDefinitions[7]);
  await transaction.insert(managerAssignments).values([
    {
      createdAt,
      employeeId: employeeId(personaDefinitions[0]),
      endsOn: '2026-01-01',
      id: seedId(1200),
      managerEmployeeId: noraEmployeeId,
      organizationId,
      startsOn: '2025-01-01',
    },
    ...personaDefinitions.slice(0, 5).map((persona, index) => ({
      createdAt,
      employeeId: employeeId(persona),
      endsOn: null,
      id: seedId(1210 + index),
      managerEmployeeId: alexEmployeeId,
      organizationId,
      startsOn: '2026-01-01',
    })),
  ]);
}

async function insertOrganizationConfiguration(transaction: SeedTransaction): Promise<void> {
  await transaction
    .insert(weeklySchedules)
    .values([
      schedule(seedId(2000), 'Full-time 40 hours', 480, 480, 480, 480, 480),
      schedule(seedId(2001), 'Part-time 24 hours', 360, 360, 360, 360, 0),
      schedule(seedId(2002), 'Reduced 30 hours', 360, 360, 360, 360, 360),
    ]);
  await transaction.insert(timePolicies).values({
    createdAt,
    id: seedId(2010),
    name: 'Northstar standard time policy',
    organizationId,
    rules: {
      breakHandling: 'MANUAL_WITH_WARNINGS',
      flexibleTimeWarningMinutes: 30,
      rounding: 'NONE',
    },
    version: 1,
  });

  const assignments: Array<typeof scheduleAssignments.$inferInsert> = [];
  for (const [index, persona] of personaDefinitions.entries()) {
    if (persona === personaDefinitions[2]) {
      assignments.push(
        assignment(seedId(2100), employeeId(persona), seedId(2000), '2025-01-01', '2026-02-15'),
        assignment(seedId(2101), employeeId(persona), seedId(2002), '2026-02-15', null),
      );
    } else {
      assignments.push(
        assignment(
          seedId(2110 + index),
          employeeId(persona),
          persona === personaDefinitions[1] ? seedId(2001) : seedId(2000),
          '2025-01-01',
          persona.active ? null : '2026-02-01',
        ),
      );
    }
  }
  await transaction.insert(scheduleAssignments).values(assignments);
  await transaction.insert(policyAssignments).values(
    personaDefinitions.map((persona, index) => ({
      createdAt,
      employeeId: employeeId(persona),
      endsOn: persona.active ? null : '2026-02-01',
      id: seedId(2200 + index),
      organizationId,
      policyId: seedId(2010),
      startsOn: '2025-01-01',
    })),
  );
  await transaction.insert(holidays).values([
    {
      createdAt,
      holidayDate: '2026-02-16',
      id: seedId(2300),
      name: 'Northstar Studio Day',
      organizationId,
    },
  ]);
}

async function insertAttendanceAndCorrections(transaction: SeedTransaction): Promise<void> {
  const events = createPunchEvents();
  await transaction.insert(punchEvents).values(events);
  const headByPersona = new Map<
    number,
    { revision: number; state: 'OFF_WORK' | 'ON_BREAK' | 'WORKING' }
  >([
    [10, { revision: 8, state: 'WORKING' }],
    [40, { revision: 1, state: 'WORKING' }],
    [50, { revision: 2, state: 'ON_BREAK' }],
  ]);
  await transaction.insert(attendanceHeads).values(
    personaDefinitions.map((persona) => {
      const personaEvents = events.filter((event) => event.employeeId === employeeId(persona));
      const head = headByPersona.get(persona.id) ?? {
        revision: personaEvents.length / 2,
        state: 'OFF_WORK' as const,
      };
      return {
        attendanceRevision: head.revision,
        employeeId: employeeId(persona),
        nextEventSequence: personaEvents.length + 1,
        organizationId,
        state: head.state,
        updatedAt: '2026-11-02T12:00:00.000Z',
      };
    }),
  );

  const danielId = employeeId(personaDefinitions[3]);
  await transaction.insert(correctionRequests).values([
    {
      createdAt,
      employeeId: danielId,
      id: seedId(3000),
      localDate: '2026-02-04',
      organizationId,
      originalInterpretation: {
        calculation: {
          balanceMinutes: -30,
          breakMinutes: 30,
          creditedMinutes: 450,
          expectedMinutes: 480,
          workedMinutes: 450,
        },
        events: [],
        projectionId: seedId(3100),
      },
      proposedInterpretation: {
        endsAt: '2026-02-04T16:00:00Z',
        kind: 'REPLACE_DAILY_WORK_INTERVAL',
        startsAt: '2026-02-04T08:00:00Z',
      },
      reason: 'I forgot to clock out after the client review.',
      requestedByEmployeeId: danielId,
      status: 'SUBMITTED',
      version: 1,
    },
    {
      createdAt,
      employeeId: danielId,
      id: seedId(3001),
      localDate: '2026-01-22',
      organizationId,
      originalInterpretation: {
        calculation: {
          balanceMinutes: -60,
          breakMinutes: 0,
          creditedMinutes: 420,
          expectedMinutes: 480,
          workedMinutes: 420,
        },
        events: [],
        projectionId: seedId(3101),
      },
      proposedInterpretation: {
        endsAt: '2026-01-22T16:00:00Z',
        kind: 'REPLACE_DAILY_WORK_INTERVAL',
        startsAt: '2026-01-22T07:00:00Z',
      },
      reason: 'I thought the meeting started earlier.',
      requestedByEmployeeId: danielId,
      status: 'REJECTED',
      version: 1,
    },
  ]);
  await transaction.insert(correctionDecisions).values({
    action: 'REJECT',
    actorAccountId: accountId(personaDefinitions[5]),
    actorAuthority: 'CURRENT_MANAGER',
    actorEmployeeId: employeeId(personaDefinitions[5]),
    correctionRequestId: seedId(3001),
    createdAt,
    decidedAt: '2026-01-23T10:00:00.000Z',
    id: seedId(3010),
    organizationId,
    reason: 'The calendar and access record support the original time.',
  });
}

async function insertAbsenceAndBalances(transaction: SeedTransaction): Promise<void> {
  await transaction
    .insert(absenceTypes)
    .values([
      absenceType(seedId(4000), 'VACATION', 'Vacation', mvpAbsenceTypePolicies.VACATION),
      absenceType(seedId(4001), 'SICKNESS', 'Sickness', mvpAbsenceTypePolicies.SICKNESS),
      absenceType(seedId(4002), 'UNPAID', 'Unpaid leave', mvpAbsenceTypePolicies.UNPAID),
    ]);

  const emmaId = employeeId(personaDefinitions[0]);
  const leonId = employeeId(personaDefinitions[1]);
  const sofiaId = employeeId(personaDefinitions[2]);
  const danielId = employeeId(personaDefinitions[3]);
  const minaId = employeeId(personaDefinitions[4]);
  await transaction
    .insert(absenceRequests)
    .values([
      absenceRequest(seedId(4100), emmaId, seedId(4000), 'APPROVED', '2026-02-10T09:00:00.000Z'),
      absenceRequest(seedId(4101), leonId, seedId(4000), 'SUBMITTED', '2026-02-02T09:00:00.000Z'),
      absenceRequest(seedId(4102), sofiaId, seedId(4000), 'APPROVED', '2026-02-10T10:00:00.000Z'),
      absenceRequest(seedId(4103), minaId, seedId(4001), 'REPORTED', '2026-02-06T08:00:00.000Z'),
      absenceRequest(seedId(4104), danielId, seedId(4002), 'APPROVED', '2026-02-12T08:00:00.000Z'),
      absenceRequest(
        seedId(4105),
        emmaId,
        seedId(4000),
        'PARTIALLY_CANCELLED',
        '2026-01-05T08:00:00.000Z',
        2,
      ),
    ]);

  const coverage = [
    coverageSegment(seedId(4200), seedId(4100), '2026-02-19', 'FULL_DAY'),
    ...['2026-02-05', '2026-02-06', '2026-02-07', '2026-02-08', '2026-02-09'].map((date, index) =>
      coverageSegment(seedId(4210 + index), seedId(4101), date, 'FULL_DAY'),
    ),
    coverageSegment(seedId(4220), seedId(4102), '2026-02-17', 'FIRST_HALF'),
    coverageSegment(seedId(4230), seedId(4103), '2026-02-03', 'FULL_DAY'),
    coverageSegment(seedId(4240), seedId(4104), '2026-02-20', 'FULL_DAY'),
    coverageSegment(seedId(4250), seedId(4105), '2026-01-12', 'FULL_DAY'),
    coverageSegment(seedId(4251), seedId(4105), '2026-01-13', 'FULL_DAY'),
  ];
  await transaction.insert(absenceCoverageSegments).values(coverage);

  await transaction
    .insert(absenceDecisions)
    .values([
      absenceDecision(
        seedId(4300),
        seedId(4100),
        'APPROVE',
        accountId(personaDefinitions[5]),
        employeeId(personaDefinitions[5]),
        null,
      ),
      absenceDecision(
        seedId(4301),
        seedId(4102),
        'APPROVE',
        accountId(personaDefinitions[5]),
        employeeId(personaDefinitions[5]),
        null,
      ),
      absenceDecision(
        seedId(4302),
        seedId(4103),
        'ACKNOWLEDGE',
        accountId(personaDefinitions[5]),
        employeeId(personaDefinitions[5]),
        null,
      ),
      absenceDecision(
        seedId(4303),
        seedId(4104),
        'APPROVE',
        accountId(personaDefinitions[5]),
        employeeId(personaDefinitions[5]),
        null,
      ),
      absenceDecision(
        seedId(4304),
        seedId(4105),
        'APPROVE',
        accountId(personaDefinitions[5]),
        employeeId(personaDefinitions[5]),
        'Partial cancellation approved.',
      ),
    ]);
  await transaction
    .insert(absenceEffects)
    .values([
      absenceEffect(
        seedId(4400),
        seedId(4100),
        seedId(4200),
        seedId(4300),
        emmaId,
        '2026-02-19',
        0,
        360,
        480,
      ),
      absenceEffect(
        seedId(4401),
        seedId(4102),
        seedId(4220),
        seedId(4301),
        sofiaId,
        '2026-02-17',
        0,
        180,
        180,
      ),
      absenceEffect(
        seedId(4402),
        seedId(4103),
        seedId(4230),
        seedId(4302),
        minaId,
        '2026-02-03',
        0,
        480,
        0,
      ),
      absenceEffect(
        seedId(4403),
        seedId(4104),
        seedId(4240),
        seedId(4303),
        danielId,
        '2026-02-20',
        480,
        0,
        0,
      ),
      absenceEffect(
        seedId(4404),
        seedId(4105),
        seedId(4250),
        seedId(4304),
        emmaId,
        '2026-01-12',
        0,
        480,
        480,
      ),
    ]);

  await transaction
    .insert(leaveEntitlementEntries)
    .values([
      leaveEntry(seedId(4500), emmaId, 'ALLOCATION', 9600, seedId(4600), '2026-01-01'),
      leaveEntry(seedId(4501), emmaId, 'APPROVED_DEDUCTION', -480, seedId(4100), '2026-02-19'),
      leaveEntry(seedId(4502), emmaId, 'APPROVED_DEDUCTION', -960, seedId(4105), '2026-01-12'),
      leaveEntry(seedId(4503), emmaId, 'CANCELLATION_RESTORATION', 240, seedId(4304), '2026-01-13'),
      leaveEntry(seedId(4510), leonId, 'ALLOCATION', 4800, seedId(4610), '2026-01-01'),
      leaveEntry(seedId(4511), leonId, 'PENDING_RESERVATION', -720, seedId(4101), '2026-02-05'),
      leaveEntry(seedId(4520), sofiaId, 'ALLOCATION', 4800, seedId(4620), '2026-01-01'),
      leaveEntry(seedId(4521), sofiaId, 'APPROVED_DEDUCTION', -180, seedId(4102), '2026-02-17'),
    ]);

  await transaction.insert(dailyProjections).values(createDailyProjections());
  await transaction.insert(timeAccountEntries).values(createTimeAccountEntries());
}

async function insertPeriodsAndAudit(transaction: SeedTransaction): Promise<void> {
  const owenId = employeeId(personaDefinitions[8]);
  const alexId = employeeId(personaDefinitions[5]);
  await transaction.insert(monthlyPeriods).values([
    period(seedId(5000), employeeId(personaDefinitions[0]), '2026-03-01', 'OPEN', 1),
    period(seedId(5001), employeeId(personaDefinitions[3]), '2026-02-01', 'SUBMITTED', 2, {
      submittedAt: '2026-03-02T09:00:00.000Z',
    }),
    period(seedId(5002), owenId, '2026-01-01', 'LOCKED', 4, {
      approvedAt: '2026-02-03T09:00:00.000Z',
      lockedAt: '2026-02-04T09:00:00.000Z',
      submittedAt: '2026-02-02T09:00:00.000Z',
    }),
    period(seedId(5003), employeeId(personaDefinitions[4]), '2026-02-01', 'LOCKED', 4, {
      approvedAt: '2026-03-03T09:00:00.000Z',
      lockedAt: '2026-03-04T09:00:00.000Z',
      submittedAt: '2026-03-02T09:00:00.000Z',
    }),
  ]);
  await transaction.insert(approvedMonthlySnapshots).values([
    {
      approvedAt: '2026-02-03T09:00:00.000Z',
      approvedByEmployeeId: alexId,
      createdAt,
      engineVersion: 'seed-engine-v1',
      id: seedId(5010),
      monthlyPeriodId: seedId(5002),
      organizationId,
      periodVersion: 3,
      schemaVersion: 1,
      snapshot: {
        closingBalanceMinutes: 615,
        dailyRows: [{ balanceMinutes: 0, localDate: '2026-01-15' }],
        employeeId: owenId,
        openingBalanceMinutes: 615,
        organizationId,
      },
      snapshotFingerprint: '8'.repeat(64),
      sourceFingerprint: '7'.repeat(64),
    },
    {
      approvedAt: '2026-03-03T09:00:00.000Z',
      approvedByEmployeeId: alexId,
      createdAt,
      engineVersion: 'seed-engine-v1',
      id: seedId(5011),
      monthlyPeriodId: seedId(5003),
      organizationId,
      periodVersion: 3,
      schemaVersion: 1,
      snapshot: {
        closingBalanceMinutes: 0,
        dailyRows: [
          {
            absenceCreditMinutes: 480,
            balanceMinutes: 0,
            localDate: '2026-02-03',
            neutralAbsenceEffectIds: [seedId(4402)],
          },
        ],
        employeeId: employeeId(personaDefinitions[4]),
        openingBalanceMinutes: 0,
        organizationId,
        privacyBoundary: 'NEUTRAL_ABSENCE_EFFECTS_ONLY',
      },
      snapshotFingerprint: '6'.repeat(64),
      sourceFingerprint: '5'.repeat(64),
    },
  ]);
  await transaction.insert(postLockAdjustments).values({
    createdAt,
    employeeId: owenId,
    id: seedId(5020),
    localDate: '2026-01-22',
    minutes: 13,
    monthlySnapshotId: seedId(5010),
    organizationId,
    reason: 'Approved correction to the recorded start time.',
    sourceId: seedId(5021),
  });

  await transaction.insert(domainAuditEvents).values([
    domainAudit(
      seedId(5100),
      'ROLE_ASSIGNED',
      'ASSIGNMENT',
      seedId(871),
      employeeId(personaDefinitions[6]),
      accountId(personaDefinitions[6]),
      'HR_ADMINISTRATOR',
    ),
    domainAudit(
      seedId(5101),
      'CORRECTION_REJECTED',
      'CORRECTION_REQUEST',
      seedId(3001),
      employeeId(personaDefinitions[3]),
      accountId(personaDefinitions[5]),
      'MANAGER',
    ),
    domainAudit(
      seedId(5102),
      'ABSENCE_APPROVED',
      'ABSENCE_REQUEST',
      seedId(4100),
      employeeId(personaDefinitions[0]),
      accountId(personaDefinitions[5]),
      'MANAGER',
    ),
    domainAudit(
      seedId(5103),
      'MONTHLY_PERIOD_LOCKED',
      'MONTHLY_PERIOD',
      seedId(5002),
      owenId,
      accountId(personaDefinitions[5]),
      'MANAGER',
    ),
    domainAudit(
      seedId(5104),
      'REPORT_EXPORTED',
      'EXPORT',
      seedId(5200),
      null,
      accountId(personaDefinitions[6]),
      'HR_ADMINISTRATOR',
    ),
    {
      ...domainAudit(
        seedId(5105),
        'TIME_ACCOUNT_ADJUSTED',
        'TIME_ACCOUNT',
        seedId(4812),
        employeeId(personaDefinitions[0]),
        accountId(personaDefinitions[6]),
        'HR_ADMINISTRATOR',
      ),
      facts: { minutes: 30 },
      privileged: true,
      reasonCode: 'BALANCE_RECONCILIATION',
    },
    {
      actionCode: 'DEVELOPMENT_SEED_CREATED',
      actorKind: 'SYSTEM',
      actorSystemProcess: 'northstar-seed',
      facts: { version: 1 },
      id: seedId(5106),
      occurredAt: createdAt,
      organizationId,
      outcome: 'SUCCESS',
      privileged: false,
      reasonCode: null,
      requestId: null,
      subjectEmployeeId: null,
      targetId: 'northstar-seed-v1',
      targetKind: 'CONFIGURATION',
    },
  ]);
  await transaction.insert(securityAuditEvents).values({
    actionCode: 'ACCOUNT_DEACTIVATED',
    actorAccountId: seedId(technicalAccount.id),
    actorKind: 'ACCOUNT',
    actorRole: 'SYSTEM_ADMINISTRATOR',
    facts: {},
    id: seedId(5300),
    occurredAt: '2026-02-01T12:00:00.000Z',
    organizationId,
    outcome: 'SUCCESS',
    privileged: true,
    reasonCode: null,
    requestId: seedId(5301),
    targetAccountId: accountId(personaDefinitions[8]),
    targetId: accountId(personaDefinitions[8]),
    targetKind: 'ACCOUNT',
  });
}

function createPunchEvents(): Array<typeof punchEvents.$inferInsert> {
  const rows: Array<typeof punchEvents.$inferInsert> = [];
  const addSession = (personaIndex: number, sequence: number, start: string, end: string) => {
    const persona = personaDefinitions[personaIndex];
    if (persona === undefined) throw new DevelopmentSeedError('SEED_DRIFT');
    const commandId = seedId(6000 + rows.length);
    rows.push(
      punch(
        seedId(6100 + rows.length),
        employeeId(persona),
        sequence,
        'CLOCK_IN',
        start,
        commandId,
      ),
      punch(
        seedId(6100 + rows.length + 1),
        employeeId(persona),
        sequence + 1,
        'CLOCK_OUT',
        end,
        seedId(6001 + rows.length),
      ),
    );
  };
  addSession(0, 1, '2026-02-02T06:00:00.000Z', '2026-02-02T14:00:00.000Z');
  addSession(0, 3, '2026-02-03T06:00:00.000Z', '2026-02-03T14:40:00.000Z');
  addSession(0, 5, '2026-02-04T06:00:00.000Z', '2026-02-04T10:00:00.000Z');
  addSession(0, 7, '2026-02-04T10:30:00.000Z', '2026-02-04T14:30:00.000Z');
  addSession(0, 9, '2026-02-05T20:00:00.000Z', '2026-02-06T04:00:00.000Z');
  addSession(0, 11, '2026-02-16T06:00:00.000Z', '2026-02-16T10:00:00.000Z');
  addSession(0, 13, '2026-02-19T06:00:00.000Z', '2026-02-19T08:00:00.000Z');
  rows.push(
    punch(
      seedId(6190),
      employeeId(personaDefinitions[0]),
      15,
      'CLOCK_IN',
      '2026-11-02T06:00:00.000Z',
      seedId(6090),
    ),
  );
  addSession(1, 1, '2026-02-02T06:00:00.000Z', '2026-02-02T11:00:00.000Z');
  addSession(1, 3, '2026-03-29T00:30:00.000Z', '2026-03-29T01:30:00.000Z');
  addSession(1, 5, '2026-10-25T00:30:00.000Z', '2026-10-25T01:30:00.000Z');
  addSession(2, 1, '2026-02-17T09:00:00.000Z', '2026-02-17T12:00:00.000Z');
  rows.push(
    punch(
      seedId(6191),
      employeeId(personaDefinitions[3]),
      1,
      'CLOCK_IN',
      '2026-02-04T06:10:00.000Z',
      seedId(6091),
    ),
  );
  rows.push(
    punch(
      seedId(6192),
      employeeId(personaDefinitions[4]),
      1,
      'CLOCK_IN',
      '2026-11-02T06:00:00.000Z',
      seedId(6092),
    ),
    punch(
      seedId(6193),
      employeeId(personaDefinitions[4]),
      2,
      'BREAK_START',
      '2026-11-02T10:00:00.000Z',
      seedId(6093),
    ),
  );
  return rows;
}

function createDailyProjections(): Array<typeof dailyProjections.$inferInsert> {
  const emmaId = employeeId(personaDefinitions[0]);
  return [
    projection(seedId(4700), emmaId, '2026-02-02', 'COMPLETE', 480, 480, 0, 0, 480, 0),
    {
      ...projection(seedId(4701), emmaId, '2026-02-03', 'COMPLETE', 480, 510, 0, 0, 510, 30, [
        'FLEXIBLE_TIME_WARNING',
      ]),
      projectionVersion: 2,
      sourceFingerprint: '4'.repeat(64),
      sourceReferences: { recalculatesFingerprint: '3'.repeat(64), seedScenario: 'EX-055' },
    },
    projection(
      seedId(4702),
      employeeId(personaDefinitions[1]),
      '2026-02-02',
      'COMPLETE',
      360,
      300,
      0,
      0,
      300,
      -60,
    ),
    projection(
      seedId(4703),
      employeeId(personaDefinitions[1]),
      '2026-02-06',
      'COMPLETE',
      0,
      0,
      0,
      0,
      0,
      0,
    ),
    projection(
      seedId(4704),
      employeeId(personaDefinitions[2]),
      '2026-02-17',
      'COMPLETE',
      360,
      180,
      0,
      180,
      360,
      0,
    ),
    projection(
      seedId(4705),
      employeeId(personaDefinitions[3]),
      '2026-02-04',
      'INCOMPLETE',
      480,
      0,
      0,
      0,
      0,
      -480,
      ['ATTENDANCE_INCOMPLETE'],
    ),
    projection(
      seedId(4706),
      employeeId(personaDefinitions[4]),
      '2026-02-03',
      'COMPLETE',
      480,
      0,
      0,
      480,
      480,
      0,
    ),
    projection(seedId(4707), emmaId, '2026-02-16', 'COMPLETE', 0, 240, 0, 0, 240, 240, [
      'WORK_ON_HOLIDAY',
    ]),
    projection(seedId(4708), emmaId, '2026-02-19', 'COMPLETE', 480, 120, 0, 360, 480, 0, [
      'WORK_DURING_ABSENCE',
    ]),
  ];
}

function createTimeAccountEntries(): Array<typeof timeAccountEntries.$inferInsert> {
  const emmaId = employeeId(personaDefinitions[0]);
  return [
    timeEntry(
      seedId(4800),
      emmaId,
      '2026-01-01',
      'OPENING_BALANCE',
      600,
      seedId(4900),
      'OPENING_BALANCE',
    ),
    timeEntry(
      seedId(4801),
      emmaId,
      '2026-02-02',
      'DAILY_DELTA',
      0,
      seedId(4700),
      'DAILY_CALCULATION',
    ),
    timeEntry(
      seedId(4802),
      emmaId,
      '2026-02-03',
      'DAILY_DELTA',
      40,
      seedId(4701),
      'DAILY_CALCULATION',
      'SYSTEM',
      'northstar-seed',
      '3'.repeat(64),
    ),
    timeEntry(
      seedId(4803),
      emmaId,
      '2026-02-03',
      'DAILY_RECALCULATION_DELTA',
      -10,
      seedId(4903),
      'UNLOCKED_RECALCULATION',
      'SYSTEM',
      'northstar-seed',
      '4'.repeat(64),
    ),
    timeEntry(
      seedId(4804),
      employeeId(personaDefinitions[1]),
      '2026-02-02',
      'DAILY_DELTA',
      -60,
      seedId(4702),
      'DAILY_CALCULATION',
    ),
    timeEntry(
      seedId(4805),
      employeeId(personaDefinitions[2]),
      '2026-02-06',
      'OPENING_BALANCE',
      0,
      seedId(4905),
      'OPENING_BALANCE',
    ),
    timeEntry(
      seedId(4812),
      emmaId,
      '2026-02-10',
      'MANUAL_ADMINISTRATIVE_ADJUSTMENT',
      30,
      seedId(4912),
      'BALANCE_RECONCILIATION',
      'ACCOUNT',
      accountId(personaDefinitions[6]),
    ),
    timeEntry(
      seedId(4819),
      employeeId(personaDefinitions[8]),
      '2026-01-01',
      'OPENING_BALANCE',
      615,
      seedId(4919),
      'OPENING_BALANCE',
    ),
    timeEntry(
      seedId(4820),
      employeeId(personaDefinitions[8]),
      '2026-01-22',
      'POST_LOCK_ADJUSTMENT',
      13,
      seedId(5021),
      'POST_LOCK_CORRECTION',
    ),
  ];
}

async function validateExistingSeed(
  transaction: SeedTransaction,
  organization: { id: string; name: string; timeZone: string },
): Promise<void> {
  const expectedAccountIds = [...personaDefinitions.map(accountId), seedId(technicalAccount.id)];
  const expectedEmployeeIds = personaDefinitions.map(employeeId);
  const accounts = await transaction
    .select({ value: count() })
    .from(authUsers)
    .where(inArray(authUsers.id, expectedAccountIds));
  const people = await transaction
    .select({ value: count() })
    .from(employees)
    .where(inArray(employees.id, expectedEmployeeIds));
  const snapshots = await transaction
    .select({ value: count() })
    .from(approvedMonthlySnapshots)
    .where(eq(approvedMonthlySnapshots.id, seedId(5010)));
  const marker = await transaction
    .select({ value: count() })
    .from(domainAuditEvents)
    .where(
      and(
        eq(domainAuditEvents.actionCode, 'DEVELOPMENT_SEED_CREATED'),
        eq(domainAuditEvents.targetId, 'northstar-seed-v1'),
      ),
    );
  if (
    organization.name !== 'Northstar Studio' ||
    organization.timeZone !== 'Europe/Athens' ||
    accounts[0]?.value !== expectedAccountIds.length ||
    people[0]?.value !== expectedEmployeeIds.length ||
    snapshots[0]?.value !== 1 ||
    marker[0]?.value !== 1
  ) {
    throw new DevelopmentSeedError('SEED_DRIFT');
  }
}

function validateTarget(configuration: DevelopmentSeedConfiguration): void {
  if (configuration.environment === 'production')
    throw new DevelopmentSeedError('PRODUCTION_DISABLED');
  let target: URL;
  try {
    target = new URL(configuration.connectionString);
  } catch {
    throw new DevelopmentSeedError('TARGET_NOT_LOCAL');
  }
  if (configuration.environment === 'development') {
    const localHost =
      target.hostname === '127.0.0.1' ||
      target.hostname === 'localhost' ||
      target.hostname === '::1';
    if (!localHost || target.pathname !== '/workledger_dev') {
      throw new DevelopmentSeedError('TARGET_NOT_LOCAL');
    }
  }
}

function seedResult(status: DevelopmentSeedResult['status']): DevelopmentSeedResult {
  return Object.freeze({
    anchorDate: DEVELOPMENT_SEED_ANCHOR_DATE,
    organizationId,
    personaCount: personaDefinitions.length + 1,
    status,
  });
}

function role(
  id: string,
  userId: string,
  value: 'HR_ADMINISTRATOR' | 'MANAGER' | 'SYSTEM_ADMINISTRATOR',
): typeof accountRoleAssignments.$inferInsert {
  return { assignedAt: createdDate, id, organizationId, role: value, userId };
}

function schedule(
  id: string,
  name: string,
  mondayMinutes: number,
  tuesdayMinutes: number,
  wednesdayMinutes: number,
  thursdayMinutes: number,
  fridayMinutes: number,
): typeof weeklySchedules.$inferInsert {
  return {
    createdAt,
    fridayMinutes,
    id,
    mondayMinutes,
    name,
    organizationId,
    saturdayMinutes: 0,
    sundayMinutes: 0,
    thursdayMinutes,
    tuesdayMinutes,
    version: 1,
    wednesdayMinutes,
  };
}

function assignment(
  id: string,
  targetEmployeeId: string,
  scheduleId: string,
  startsOn: string,
  endsOn: string | null,
): typeof scheduleAssignments.$inferInsert {
  return {
    createdAt,
    employeeId: targetEmployeeId,
    endsOn,
    id,
    organizationId,
    scheduleId,
    startsOn,
  };
}

function punch(
  id: string,
  targetEmployeeId: string,
  eventSequence: number,
  eventType: 'BREAK_START' | 'CLOCK_IN' | 'CLOCK_OUT',
  occurredAt: string,
  commandId: string,
): typeof punchEvents.$inferInsert {
  return {
    actorEmployeeId: targetEmployeeId,
    commandId,
    eventSequence,
    eventType,
    id,
    occurredAt,
    organizationId,
    recordedAt: occurredAt,
    employeeId: targetEmployeeId,
  };
}

function absenceType(
  id: string,
  code: string,
  name: string,
  policy: Readonly<Record<string, unknown>>,
): typeof absenceTypes.$inferInsert {
  return {
    active: true,
    code,
    createdAt,
    id,
    name,
    organizationId,
    policy,
    validFrom: '2020-01-01',
    validTo: null,
    version: 1,
  };
}

function absenceRequest(
  id: string,
  targetEmployeeId: string,
  absenceTypeId: string,
  status: typeof absenceRequests.$inferInsert.status,
  submittedAt: string,
  version = 1,
): typeof absenceRequests.$inferInsert {
  return {
    absenceTypeId,
    createdAt,
    employeeId: targetEmployeeId,
    id,
    organizationId,
    requestedByEmployeeId: targetEmployeeId,
    status,
    submittedAt,
    version,
  };
}

function coverageSegment(
  id: string,
  absenceRequestId: string,
  localDate: string,
  kind: 'FIRST_HALF' | 'FULL_DAY',
): typeof absenceCoverageSegments.$inferInsert {
  return { absenceRequestId, createdAt, id, kind, localDate, organizationId };
}

function absenceDecision(
  id: string,
  absenceRequestId: string,
  action: typeof absenceDecisions.$inferInsert.action,
  actorAccountId: string,
  actorEmployeeId: string,
  reason: string | null,
): typeof absenceDecisions.$inferInsert {
  return {
    absenceRequestId,
    action,
    actorAccountId,
    actorAuthority: 'CURRENT_MANAGER',
    actorEmployeeId,
    createdAt,
    decidedAt: '2026-02-10T12:00:00.000Z',
    id,
    organizationId,
    reason,
  };
}

function absenceEffect(
  id: string,
  absenceRequestId: string,
  absenceCoverageSegmentId: string,
  sourceDecisionId: string,
  targetEmployeeId: string,
  localDate: string,
  expectedReductionMinutes: number,
  creditMinutes: number,
  entitlementMinutes: number,
): typeof absenceEffects.$inferInsert {
  return {
    absenceCoverageSegmentId,
    absenceRequestId,
    createdAt,
    creditMinutes,
    effectVersion: 1,
    employeeId: targetEmployeeId,
    entitlementMinutes,
    expectedReductionMinutes,
    id,
    localDate,
    organizationId,
    sourceDecisionId,
  };
}

function leaveEntry(
  id: string,
  targetEmployeeId: string,
  entryType: typeof leaveEntitlementEntries.$inferInsert.entryType,
  minutes: number,
  sourceId: string,
  effectiveOn: string,
): typeof leaveEntitlementEntries.$inferInsert {
  return {
    absenceTypeId: seedId(4000),
    createdAt,
    effectiveOn,
    employeeId: targetEmployeeId,
    entryType,
    id,
    minutes,
    organizationId,
    sourceId,
  };
}

function projection(
  id: string,
  targetEmployeeId: string,
  localDate: string,
  calculationStatus: typeof dailyProjections.$inferInsert.calculationStatus,
  expectedMinutes: number,
  workedMinutes: number,
  breakMinutes: number,
  absenceCreditMinutes: number,
  creditedMinutes: number,
  balanceMinutes: number,
  warningCodes: readonly string[] = [],
): typeof dailyProjections.$inferInsert {
  return {
    absenceCreditMinutes,
    adjustmentMinutes: 0,
    balanceMinutes,
    breakMinutes,
    calculatedAt: '2026-11-02T12:00:00.000Z',
    calculationStatus,
    creditedMinutes,
    employeeId: targetEmployeeId,
    engineVersion: 'seed-engine-v1',
    expectedMinutes,
    id,
    localDate,
    organizationId,
    projectionVersion: 1,
    sourceFingerprint: id.replaceAll('-', '').padEnd(64, '0').slice(0, 64),
    sourceReferences: { seedScenario: localDate },
    warningCodes,
    workedMinutes,
  };
}

function timeEntry(
  id: string,
  targetEmployeeId: string,
  localDate: string,
  entryType: typeof timeAccountEntries.$inferInsert.entryType,
  minutes: number,
  sourceId: string,
  explanationCode: string,
  actorKind: 'ACCOUNT' | 'SYSTEM' = 'SYSTEM',
  actorId = 'northstar-seed',
  sourceFingerprint = sourceId.replaceAll('-', '').padEnd(64, '0').slice(0, 64),
): typeof timeAccountEntries.$inferInsert {
  return {
    actorId,
    actorKind,
    createdAt,
    employeeId: targetEmployeeId,
    entryType,
    explanationCode,
    id,
    localDate,
    minutes,
    organizationId,
    postedAt: '2026-11-02T12:00:00.000Z',
    sourceFingerprint,
    sourceId,
  };
}

function period(
  id: string,
  targetEmployeeId: string,
  monthStart: string,
  status: typeof monthlyPeriods.$inferInsert.status,
  version: number,
  instants: { approvedAt?: string; lockedAt?: string; submittedAt?: string } = {},
): typeof monthlyPeriods.$inferInsert {
  return {
    createdAt,
    employeeId: targetEmployeeId,
    id,
    monthStart,
    organizationId,
    status,
    version,
    ...instants,
  };
}

function domainAudit(
  id: string,
  actionCode: string,
  targetKind: typeof domainAuditEvents.$inferInsert.targetKind,
  targetId: string,
  subjectEmployeeId: string | null,
  actorAccountId: string,
  actorRole: typeof domainAuditEvents.$inferInsert.actorRole,
): typeof domainAuditEvents.$inferInsert {
  return {
    actionCode,
    actorAccountId,
    actorKind: 'ACCOUNT',
    actorRole,
    facts: {},
    id,
    occurredAt: '2026-02-10T12:00:00.000Z',
    organizationId,
    outcome: 'SUCCESS',
    privileged: false,
    reasonCode: null,
    requestId: null,
    subjectEmployeeId,
    targetId,
    targetKind,
  };
}

function seedId(value: number): string {
  return `00000000-0000-4000-8000-${value.toString().padStart(12, '0')}`;
}
