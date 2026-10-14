const path = require('path');
const prisma = require('../config/db');
const { processEventCsvUpload } = require('../utils/csvMatcher');

/**
 * Creates a new institutional event
 * POST /api/events
 * Restricted to: FACULTY, HOD_ADMIN
 */
async function createEvent(req, res) {
  try {
    const {
      title,
      description,
      category,
      scope = 'INTRA_COLLEGE',
      eventDate,
      semesterTag,
      naacCriteriaTag,
      organizerDept,
    } = req.body;

    if (!title || !category || !eventDate || !semesterTag || !organizerDept) {
      return res.status(400).json({
        success: false,
        message:
          'Missing required fields: title, category, eventDate, semesterTag, and organizerDept are mandatory.',
      });
    }

    const event = await prisma.event.create({
      data: {
        title: title.trim(),
        description: description ? description.trim() : null,
        category: category.toUpperCase(),
        scope: scope.toUpperCase(),
        eventDate: new Date(eventDate),
        semesterTag: parseInt(semesterTag, 10),
        naacCriteriaTag: naacCriteriaTag ? naacCriteriaTag.trim() : null,
        organizerDept: organizerDept.trim(),
        createdById: req.user.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Event created successfully.',
      event,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to create event: ${error.message}`,
    });
  }
}

/**
 * Retrieves a list of all institutional events with optional category/department filters
 * GET /api/events
 */
async function listEvents(req, res) {
  try {
    const { category, scope, department, semester } = req.query;

    const whereClause = {};
    if (category) whereClause.category = category.toUpperCase();
    if (scope) whereClause.scope = scope.toUpperCase();
    if (department) whereClause.organizerDept = { contains: department, mode: 'insensitive' };
    if (semester) whereClause.semesterTag = parseInt(semester, 10);

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: {
            name: true,
            department: true,
          },
        },
        _count: {
          select: {
            claims: true,
            certificates: true,
          },
        },
      },
      orderBy: {
        eventDate: 'desc',
      },
    });

    return res.status(200).json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to fetch events: ${error.message}`,
    });
  }
}

/**
 * Retrieves a single event by ID with its participant roster and claim statistics
 * GET /api/events/:id
 */
async function getEventById(req, res) {
  try {
    const { id } = req.get('id') || req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
            department: true,
          },
        },
        csvRoster: true,
        claims: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                rollNo: true,
                department: true,
              },
            },
            certificate: {
              select: {
                certificateNo: true,
                cryptoSignature: true,
                issuedAt: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    return res.status(200).json({
      success: true,
      event,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to fetch event details: ${error.message}`,
    });
  }
}

/**
 * Handles Faculty Master Participant CSV Roster upload for an event.
 * Automatically parses rows, saves to EventCsvRoster, and bulk-issues
 * cryptographic certificates for matching student claims.
 * POST /api/events/:id/upload-roster
 * Restricted to: FACULTY, HOD_ADMIN
 */
async function uploadEventCsv(req, res) {
  try {
    const { id: eventId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No CSV file uploaded. Please attach a valid .csv roster file.',
      });
    }

    // 1. Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    // 2. Process CSV via csvMatcher engine
    const csvFilePath = req.file.path;
    const result = await processEventCsvUpload({
      eventId,
      csvFilePath,
      facultyId: req.user.id,
      autoIssueForRegisteredStudents: true,
    });

    return res.status(200).json({
      success: true,
      message: `Master CSV roster successfully processed. ${result.totalRowsParsed} participant records parsed, ${result.pendingClaimsAutoVerified} pending claims auto-verified, and ${result.directCertificatesIssued} new certificates directly issued.`,
      stats: {
        totalRowsParsed: result.totalRowsParsed,
        rosterSavedCount: result.rosterSavedCount,
        pendingClaimsAutoVerified: result.pendingClaimsAutoVerified,
        directCertificatesIssued: result.directCertificatesIssued,
      },
      issuedCertificates: result.issuedCertificates,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to process participant CSV roster: ${error.message}`,
    });
  }
}

module.exports = {
  createEvent,
  listEvents,
  getEventById,
  uploadEventCsv,
};