const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { createSignedCertificateBundle } = require('../src/utils/cryptoSigner');
const { calculateCertificatePoints } = require('../src/config/creditRules');
const { buildCertificatePdf } = require('../src/utils/certificateBuilder');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting VeriCred Database Seeding...');

  // 1. Clean existing database records (order matters due to foreign keys)
  await prisma.facultyAssessment.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.participationClaim.deleteMany();
  await prisma.eventCsvRoster.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleared existing database tables.');

  const passwordHash = await bcrypt.hash('Password@123', 10);

  // 2. Create Users (Admin, Faculty, Students)
  const hodAdmin = await prisma.user.create({
    data: {
      name: 'Dr. R. K. Jaiswal (HOD IQAC)',
      email: 'hod.it@skit.ac.in',
      passwordHash,
      role: 'HOD_ADMIN',
      department: 'Information Technology',
      batchYear: 2010,
      currentSemester: 8,
    },
  });

  const facultyMember = await prisma.user.create({
    data: {
      name: 'Prof. Ankit Sharma',
      email: 'ankit.sharma@skit.ac.in',
      passwordHash,
      role: 'FACULTY',
      department: 'Information Technology',
      batchYear: 2015,
      currentSemester: 6,
    },
  });

  const student1 = await prisma.user.create({
    data: {
      name: 'Aarav Sharma',
      email: 'aarav.23eskit001@skit.ac.in',
      passwordHash,
      role: 'STUDENT',
      rollNo: '23ESKIT001',
      department: 'Information Technology',
      batchYear: 2023,
      currentSemester: 5,
      section: 'A',
    },
  });

  const student2 = await prisma.user.create({
    data: {
      name: 'Priya Verma',
      email: 'priya.23eskit014@skit.ac.in',
      passwordHash,
      role: 'STUDENT',
      rollNo: '23ESKIT014',
      department: 'Information Technology',
      batchYear: 2023,
      currentSemester: 5,
      section: 'A',
    },
  });

  const student3 = await prisma.user.create({
    data: {
      name: 'Kunal Meena',
      email: 'kunal.23eskit028@skit.ac.in',
      passwordHash,
      role: 'STUDENT',
      rollNo: '23ESKIT028',
      department: 'Information Technology',
      batchYear: 2023,
      currentSemester: 5,
      section: 'B',
    },
  });

  console.log('👤 Created 5 sample users (Admin, Faculty, 3 Students).');

  // 3. Create Events
  const event1 = await prisma.event.create({
    data: {
      title: 'Smart India Internal Hackathon 2026',
      description: '36-hour intense software product development competition for smart infrastructure.',
      category: 'HACKATHON',
      scope: 'NATIONAL',
      eventDate: new Date('2026-03-15T09:00:00Z'),
      semesterTag: 5,
      naacCriteriaTag: '3.2.2 - Innovation & Hackathons',
      organizerDept: 'Information Technology',
      createdById: facultyMember.id,
    },
  });

  const event2 = await prisma.event.create({
    data: {
      title: 'Annual Inter-College CodeSprint 2026',
      description: 'Competitive programming and data structures algorithmic showdown.',
      category: 'TECHNICAL',
      scope: 'INTER_COLLEGE',
      eventDate: new Date('2026-04-10T10:00:00Z'),
      semesterTag: 5,
      naacCriteriaTag: '5.3.1 - Student Competitions',
      organizerDept: 'Computer Science & Engineering',
      createdById: facultyMember.id,
    },
  });

  console.log('📅 Created 2 institutional events.');

  // 4. Seed Faculty CSV Rosters & Auto-Issue Certificates for Students
  const rosterDataEvent1 = [
    { rollNo: '23ESKIT001', name: 'Aarav Sharma', role: 'WINNER_1ST' },
    { rollNo: '23ESKIT014', name: 'Priya Verma', role: 'FINALIST' },
    { rollNo: '23ESKIT028', name: 'Kunal Meena', role: 'PARTICIPANT' },
  ];

  for (const entry of rosterDataEvent1) {
    await prisma.eventCsvRoster.create({
      data: {
        eventId: event1.id,
        studentRollNo: entry.rollNo,
        studentName: entry.name,
        participationRole: entry.role,
        isClaimed: true,
      },
    });

    // Find student user
    const studentUser = await prisma.user.findUnique({
      where: { rollNo: entry.rollNo },
    });

    if (studentUser) {
      // Create Claim
      const claim = await prisma.participationClaim.create({
        data: {
          studentId: studentUser.id,
          eventId: event1.id,
          claimedRole: entry.role,
          achievementNotes: 'Auto-verified via Faculty Master CSV Roster',
          status: 'APPROVED_BY_CSV',
          verifiedById: facultyMember.id,
          verifiedAt: new Date(),
        },
      });

      // Generate Cryptographic Certificate
      const certificateNo = `VC-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const issuedAt = new Date();
      const creditPoints = calculateCertificatePoints(event1.scope, entry.role);

      const { payloadString, cryptoSignature, qrVerificationUrl } =
        createSignedCertificateBundle({
          certificateNo,
          studentRollNo: entry.rollNo,
          eventId: event1.id,
          participationRole: entry.role,
          issuedAt,
        });

      const { publicPdfUrl } = await buildCertificatePdf({
        certificateNo,
        studentName: studentUser.name,
        studentRollNo: entry.rollNo,
        studentDepartment: studentUser.department,
        eventTitle: event1.title,
        eventCategory: event1.category,
        eventScope: event1.scope,
        eventDate: event1.eventDate,
        participationRole: entry.role,
        creditPoints,
        semester: 5,
        cryptoSignature,
        qrVerificationUrl,
        issuedAt,
        verifierName: `${facultyMember.name} (Information Technology)`,
      });

      await prisma.certificate.create({
        data: {
          certificateNo,
          claimId: claim.id,
          studentId: studentUser.id,
          eventId: event1.id,
          participationRole: entry.role,
          creditPoints,
          semester: 5,
          payloadString,
          cryptoSignature,
          qrVerificationUrl,
          pdfUrl: publicPdfUrl,
          issuedAt,
        },
      });

      await prisma.user.update({
        where: { id: studentUser.id },
        data: {
          totalCreditPoints: { increment: creditPoints },
        },
      });
    }
  }

  console.log('📜 Seeded CSV rosters and issued cryptographic certificates with QR codes.');
  console.log('✨ VeriCred Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });