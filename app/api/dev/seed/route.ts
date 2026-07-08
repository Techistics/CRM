import { NextResponse } from 'next/server'
import { db } from '@/db'
import {
  leads,
  leadActivities,
  leadStageAssignments,
  leadReminders,
  tenantMembers,
  tenantTimesheets,
  consultantLogs,
  notifications,
} from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

const TENANT_ID = '08b90516-c465-4032-bee7-9c1b7da91b32'

// ─── Seed Data Pools ─────────────────────────────────────────────────────────

const LEAD_STAGES = [
  'new_lead',
  'unresponsive',
  'follow_up',
  'docs_received',
  'options_sent',
  'final_decision',
  'walkin_booked',
  'walkin_conducted',
  'cancelled',
  'paid',
] as const

const PAKISTANI_NAMES = [
  'Ahmed Raza', 'Sara Khan', 'Bilal Shahid', 'Fatima Malik', 'Usman Tariq',
  'Ayesha Nawaz', 'Zain ul Abideen', 'Mahnoor Sheikh', 'Hassan Ali', 'Sana Iqbal',
  'Hamza Baig', 'Nida Rehman', 'Fahad Chaudhry', 'Hina Javed', 'Omar Farooq',
  'Amina Siddiqui', 'Imran Butt', 'Rabia Yousuf', 'Talha Mehmood', 'Anum Riaz',
  'Kamran Aziz', 'Layla Qureshi', 'Muneeb ur Rehman', 'Sobia Manzoor', 'Adnan Ghani',
]

const CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta']

const QUALIFICATIONS = ['Intermediate', 'Bachelor\'s', 'Master\'s', 'O-Levels', 'A-Levels']

const GRADES = ['A+', 'A', 'B+', 'B', 'C', '3.5 GPA', '3.8 GPA', '2.9 GPA']

const DESTINATIONS = ['UK', 'Canada', 'Australia', 'USA', 'Germany', 'New Zealand', 'Ireland']

const PROGRAMS = [
  'BSc Computer Science', 'MBA', 'MSc Data Science', 'BSc Business Administration',
  'LLB Law', 'BSc Electrical Engineering', 'MSc Artificial Intelligence',
  'BSc Nursing', 'MSc Finance', 'BEng Civil Engineering',
]

const INTAKE_MONTHS = ['Sep 2025', 'Jan 2026', 'Sep 2026', 'Jan 2027', 'May 2026']

const SOURCES = ['website', 'referral', 'social_media', 'walk_in', 'csv_import']

const STAGE_NOTES: Record<string, string[]> = {
  new_lead: [
    'Received inquiry from website. Interested in studying abroad.',
    'Called the student, brief introduction done, will follow up.',
    'Walk-in visit. Provided initial brochures.',
  ],
  follow_up: [
    'Followed up via WhatsApp. Student is still considering options.',
    'Called 3 times — finally reached. Sending options by email.',
    'Student asked for a week to discuss with family.',
  ],
  docs_received: [
    'Passport copy and transcripts received. Checking eligibility.',
    'Documents verified. All in order for UK universities.',
    'Bank statement still pending. Reminded student.',
  ],
  options_sent: [
    'Sent 3 university options for Canada — UofT, UBC, York.',
    'Student reviewing options. Follow up next week.',
    'University list sent via email. Awaiting student feedback.',
  ],
  final_decision: [
    'Student has decided on University of Manchester.',
    'Confirmed choice: Griffith University, Australia.',
    'Student opting for University of Toronto — MBA program.',
  ],
  walkin_booked: [
    'Walk-in session scheduled for Monday 10am.',
    'Student coming in for final paperwork.',
  ],
  walkin_conducted: [
    'Walk-in done. All documents reviewed and submitted.',
    'Application submitted during walk-in. Student satisfied.',
  ],
  paid: [
    'Payment received. Processing application.',
    'Full fee paid. Visa process initiated.',
    'Receipt issued. Application submitted to university.',
  ],
  cancelled: [
    'Student changed plans due to family reasons.',
    'No response for 2 weeks. Marked cancelled.',
  ],
  unresponsive: [
    'Called 5 times, no response. Last message sent.',
    'WhatsApp seen but not replied. Will try once more.',
  ],
}

const CALL_NOTES = [
  'Called, no answer. Left voicemail.',
  'Spoke briefly — student busy, will call back tomorrow.',
  'Detailed call about visa requirements and deadlines.',
  'Student confirmed interest. Moving forward.',
  'Called parent as well, they are supportive.',
]

const WHATSAPP_MESSAGES = [
  'Hi! Just checking in on your application status. Let us know if you need anything.',
  'Please share your updated transcript when you get a chance.',
  'Reminder: your university deadline is approaching next month.',
  'Great news! Your application has been submitted successfully.',
  'Your visa appointment has been booked for the 15th.',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rand<T>(arr: readonly T[] | T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomPhone() {
  return `+923${randInt(10, 49)}${randInt(1000000, 9999999)}`
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function hoursOffset(base: Date, hours: number): Date {
  return new Date(base.getTime() + hours * 60 * 60 * 1000)
}

// Build a realistic stage journey for a lead, returning ordered (fromStage, toStage, date) transitions
function buildStageJourney(finalStage: string): Array<{ from: string; to: string; date: Date }> {
  const order = [
    'new_lead', 'follow_up', 'docs_received', 'options_sent',
    'final_decision', 'walkin_booked', 'walkin_conducted',
  ]
  const targetIdx = order.indexOf(finalStage)

  if (finalStage === 'unresponsive' || finalStage === 'cancelled' || finalStage === 'paid') {
    // Some random progress then jump to final
    const progressStages = order.slice(0, randInt(1, 3))
    const journey: Array<{ from: string; to: string; date: Date }> = []
    let prev = 'new_lead'
    progressStages.forEach((stage, i) => {
      if (i > 0) {
        journey.push({ from: prev, to: stage, date: daysAgo(30 - i * 5) })
        prev = stage
      }
    })
    journey.push({ from: prev, to: finalStage, date: daysAgo(randInt(1, 7)) })
    return journey
  }

  const journey: Array<{ from: string; to: string; date: Date }> = []
  let prev = 'new_lead'
  for (let i = 1; i <= Math.max(targetIdx, 0); i++) {
    const stageDate = daysAgo(30 - i * 4)
    journey.push({ from: prev, to: order[i], date: stageDate })
    prev = order[i]
  }
  return journey
}

// ─── Main Seed Handler ────────────────────────────────────────────────────────

export async function GET() {
  try {
    // 1. Fetch all active members of the workspace
    const members = await db.query.tenantMembers.findMany({
      where: and(
        eq(tenantMembers.tenantId, TENANT_ID),
        isNull(tenantMembers.deletedAt),
      ),
      with: { user: true },
    })

    if (members.length === 0) {
      return NextResponse.json({ error: 'No members found in workspace' }, { status: 404 })
    }

    const proMembers = members.filter((m) => m.role === 'PRO' || m.role === 'ADMIN')
    const memberIds = proMembers.map((m) => m.userId)

    // ── Pick a non-duplicate name pool ──────────────────────────────────────
    const namePool = [...PAKISTANI_NAMES].sort(() => Math.random() - 0.5)

    // ── 2. Create leads ──────────────────────────────────────────────────────
    const createdLeads: Array<{ id: string; assignedTo: string; stage: string; fullName: string }> = []

    for (let i = 0; i < Math.min(25, namePool.length); i++) {
      const name = namePool[i]
      const assignedUserId = memberIds[i % memberIds.length]
      const stage = rand([...LEAD_STAGES]) as typeof LEAD_STAGES[number]
      const createdDate = daysAgo(randInt(10, 60))

      try {
        const [lead] = await db.insert(leads).values({
          tenantId: TENANT_ID,
          fullName: name,
          contactNumber: randomPhone(),
          email: `${name.toLowerCase().replace(/\s/g, '.')}${randInt(10, 99)}@gmail.com`,
          city: rand(CITIES),
          country: 'Pakistan',
          lastQualification: rand(QUALIFICATIONS),
          grades: rand(GRADES),
          source: rand(SOURCES),
          stage,
          primaryStage: stage,
          assignedTo: assignedUserId,
          createdBy: assignedUserId,
          dealValue: String(randInt(50000, 500000)),
          dealCurrency: 'PKR',
          intakeMonth: rand(INTAKE_MONTHS),
          destinationCountry: rand(DESTINATIONS),
          programOfInterest: rand(PROGRAMS),
          lastContactedAt: daysAgo(randInt(0, 10)),
          createdAt: createdDate,
          updatedAt: createdDate,
        }).returning({ id: leads.id })

        createdLeads.push({ id: lead.id as string, assignedTo: assignedUserId, stage, fullName: name })
      } catch {
        // Skip duplicate phones/emails silently
      }
    }

    // ── 3. Add stage history + activities + notes + calls for each lead ──────
    let activitiesCount = 0
    let remindersCount = 0

    for (const lead of createdLeads) {
      const journey = buildStageJourney(lead.stage)

      // Stage transitions
      for (const step of journey) {
        const actDate = step.date

        await db.insert(leadActivities).values({
          tenantId: TENANT_ID,
          leadId: lead.id,
          userId: lead.assignedTo,
          type: 'stage_change',
          fromStage: step.from,
          toStage: step.to,
          note: rand(STAGE_NOTES[step.to] ?? STAGE_NOTES.new_lead),
          createdAt: actDate,
        })
        activitiesCount++

        // Add lead stage assignment record
        try {
          await db.insert(leadStageAssignments).values({
            tenantId: TENANT_ID,
            leadId: lead.id,
            stageKey: step.to,
            createdBy: lead.assignedTo,
            createdAt: actDate,
          }).onConflictDoNothing()
        } catch { /* ignore */ }
      }

      // Also set the initial stage assignment
      try {
        await db.insert(leadStageAssignments).values({
          tenantId: TENANT_ID,
          leadId: lead.id,
          stageKey: 'new_lead',
          createdBy: lead.assignedTo,
          createdAt: daysAgo(randInt(25, 60)),
        }).onConflictDoNothing()
      } catch { /* ignore */ }

      // Add 1-3 consultant log notes
      const notesCount = randInt(1, 3)
      for (let n = 0; n < notesCount; n++) {
        const logType = rand(['note', 'call', 'message'] as const)
        const logDate = daysAgo(randInt(0, 20))
        const logText = logType === 'call'
          ? rand(CALL_NOTES)
          : logType === 'message'
            ? rand(WHATSAPP_MESSAGES)
            : rand(STAGE_NOTES[lead.stage] ?? STAGE_NOTES.new_lead)

        await db.insert(consultantLogs).values({
          tenantId: TENANT_ID,
          leadId: lead.id,
          userId: lead.assignedTo,
          type: logType,
          body: logText,
          createdAt: logDate,
        })
      }

      // Add 1-2 call activity logs
      for (let c = 0; c < randInt(1, 2); c++) {
        await db.insert(leadActivities).values({
          tenantId: TENANT_ID,
          leadId: lead.id,
          userId: lead.assignedTo,
          type: 'call',
          note: rand(CALL_NOTES),
          createdAt: daysAgo(randInt(0, 15)),
        })
        activitiesCount++
      }

      // Add a note activity
      await db.insert(leadActivities).values({
        tenantId: TENANT_ID,
        leadId: lead.id,
        userId: lead.assignedTo,
        type: 'note',
        note: rand(STAGE_NOTES[lead.stage] ?? STAGE_NOTES.new_lead),
        createdAt: daysAgo(randInt(0, 10)),
      })
      activitiesCount++

      // Add a reminder for ~60% of leads
      if (Math.random() > 0.4) {
        const dueOffset = randInt(-5, 10) // some overdue, some upcoming
        const status = dueOffset < 0 ? 'overdue' : dueOffset === 0 ? 'completed' : 'pending'
        await db.insert(leadReminders).values({
          tenantId: TENANT_ID,
          leadId: lead.id,
          title: `Follow up with ${lead.fullName}`,
          note: `Reminder to check application progress for ${lead.fullName}.`,
          dueAt: daysAgo(-dueOffset), // negative daysAgo = future
          status,
          assignedTo: lead.assignedTo,
          createdBy: lead.assignedTo,
          completedAt: status === 'completed' ? new Date() : null,
        })
        remindersCount++
      }

      // Add a notification for each lead assignment
      await db.insert(notifications).values({
        tenantId: TENANT_ID,
        userId: lead.assignedTo,
        title: 'Lead Assigned',
        body: `${lead.fullName} has been assigned to you.`,
        type: 'lead_assigned',
        leadId: lead.id,
        read: Math.random() > 0.5,
        createdAt: daysAgo(randInt(1, 60)),
      })
    }

    // ── 4. Generate timesheet history for each member (last 14 days) ─────────
    let timesheetCount = 0

    for (const member of proMembers) {
      for (let day = 1; day <= 14; day++) {
        // Skip weekends (simulate real work schedule) — day 6 = Saturday, 7 = Sunday
        const d = daysAgo(day)
        const dayOfWeek = d.getDay() // 0=Sun, 6=Sat
        if (dayOfWeek === 0 || dayOfWeek === 6) continue

        // 90% attendance rate
        if (Math.random() > 0.9) continue

        const punchIn = new Date(d)
        punchIn.setHours(randInt(8, 10), randInt(0, 59), 0, 0)

        const workHours = randInt(6, 10)
        const punchOut = hoursOffset(punchIn, workHours)
        punchOut.setMinutes(randInt(0, 59), 0, 0)

        const totalMinutes = Math.round((punchOut.getTime() - punchIn.getTime()) / 60000)

        await db.insert(tenantTimesheets).values({
          tenantId: TENANT_ID,
          userId: member.userId,
          punchIn,
          punchOut,
          totalMinutes,
          date: punchIn.toISOString().split('T')[0],
          lastHeartbeat: punchOut,
          createdAt: punchIn,
        })
        timesheetCount++
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        leadsCreated: createdLeads.length,
        activitiesCreated: activitiesCount,
        remindersCreated: remindersCount,
        timesheetsCreated: timesheetCount,
        membersSeeded: proMembers.length,
      },
    })
  } catch (err) {
    console.error('[seed] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
