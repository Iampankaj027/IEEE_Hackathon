const crypto = require('crypto');
const prisma = require('../config/db');

/**
 * Generates a cryptographically random passcode string.
 * Format: INST-DEPT_ABBR-FAC-XXXXXX (e.g., "SKIT-IT-FAC-A7X9B2")
 */
function generatePasscodeString(department) {
  const deptAbbreviations = {
    'Information Technology': 'IT',
    'Computer Science & Engineering': 'CSE',
    'Electronics & Communication': 'ECE',
    'Electrical Engineering': 'EE',
    'Mechanical Engineering': 'ME',
    'Civil Engineering': 'CE',
  };
  const deptCode = deptAbbreviations[department] || department.substring(0, 3).toUpperCase();
  const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `SKIT-${deptCode}-FAC-${randomHex}`;
}

/**
 * Creates one or more faculty registration passcodes.
 * POST /api/admin/passcodes
 * Body: { department, targetRole?, label?, maxUses?, expiresInHours?, count? }
 * Access: HOD_ADMIN only
 */
async function createPasscodes(req, res) {
  try {
    const {
      department,
      targetRole = 'FACULTY',
      label = null,
      maxUses = 1,
      expiresInHours = 168, // Default 7 days
      count = 1,            // How many passcodes to generate in this batch
    } = req.body;

    // Validation
    if (!department) {
      return res.status(400).json({
        success: false,
        message: 'Department is required to scope the passcode.',
      });
    }

    const VALID_TARGET_ROLES = ['FACULTY', 'HOD_ADMIN'];
    const normalizedTargetRole = String(targetRole).trim().toUpperCase();
    if (!VALID_TARGET_ROLES.includes(normalizedTargetRole)) {
      return res.status(400).json({
        success: false,
        message: `Invalid target role. Allowed: ${VALID_TARGET_ROLES.join(', ')}`,
      });
    }

    const batchCount = Math.min(Math.max(parseInt(count, 10) || 1, 1), 50); // Cap at 50 per request
    const parsedMaxUses = Math.max(parseInt(maxUses, 10) || 1, 1);
    const parsedExpiresInHours = Math.max(parseFloat(expiresInHours) || 168, 1);

    const expiresAt = new Date(Date.now() + parsedExpiresInHours * 60 * 60 * 1000);

    const createdPasscodes = [];

    for (let i = 0; i < batchCount; i++) {
      // Generate a unique code (retry on collision, though extremely unlikely)
      let code;
      let attempts = 0;
      do {
        code = generatePasscodeString(department);
        attempts++;
      } while (
        attempts < 5 &&
        (await prisma.facultyPasscode.findUnique({ where: { code } }))
      );

      const passcode = await prisma.facultyPasscode.create({
        data: {
          code,
          targetRole: normalizedTargetRole,
          department: department.trim(),
          label: label ? label.trim() : null,
          maxUses: parsedMaxUses,
          expiresAt,
          createdById: req.user.id,
        },
        select: {
          id: true,
          code: true,
          targetRole: true,
          department: true,
          label: true,
          maxUses: true,
          usedCount: true,
          expiresAt: true,
          isRevoked: true,
          createdAt: true,
        },
      });

      createdPasscodes.push(passcode);
    }

    return res.status(201).json({
      success: true,
      message: `Successfully generated ${createdPasscodes.length} passcode(s).`,
      passcodes: createdPasscodes,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to create passcode(s): ${error.message}`,
    });
  }
}

/**
 * Lists all passcodes created by the authenticated HOD_ADMIN (or all if super admin).
 * GET /api/admin/passcodes?status=active|expired|revoked|exhausted&department=...
 * Access: HOD_ADMIN only
 */
async function listPasscodes(req, res) {
  try {
    const { status, department } = req.query;
    const now = new Date();

    const whereClause = {
      createdById: req.user.id,
    };

    if (department) {
      whereClause.department = department.trim();
    }

    // Fetch all matching passcodes
    const passcodes = await prisma.facultyPasscode.findMany({
      where: whereClause,
      include: {
        consumedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
            createdAt: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute derived status for each passcode
    const enriched = passcodes.map((p) => {
      let derivedStatus;
      if (p.isRevoked) {
        derivedStatus = 'REVOKED';
      } else if (p.expiresAt < now) {
        derivedStatus = 'EXPIRED';
      } else if (p.usedCount >= p.maxUses) {
        derivedStatus = 'EXHAUSTED';
      } else {
        derivedStatus = 'ACTIVE';
      }

      return {
        ...p,
        derivedStatus,
      };
    });

    // Apply status filter if specified
    let filtered = enriched;
    if (status) {
      const normalizedStatus = String(status).trim().toUpperCase();
      filtered = enriched.filter((p) => p.derivedStatus === normalizedStatus);
    }

    return res.status(200).json({
      success: true,
      total: filtered.length,
      passcodes: filtered,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to list passcodes: ${error.message}`,
    });
  }
}

/**
 * Revokes a passcode (sets isRevoked = true so it can no longer be consumed).
 * PATCH /api/admin/passcodes/:id/revoke
 * Access: HOD_ADMIN only (must own the passcode)
 */
async function revokePasscode(req, res) {
  try {
    const { id } = req.params;

    const passcode = await prisma.facultyPasscode.findUnique({
      where: { id },
    });

    if (!passcode) {
      return res.status(404).json({
        success: false,
        message: 'Passcode not found.',
      });
    }

    if (passcode.createdById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only revoke passcodes you created.',
      });
    }

    if (passcode.isRevoked) {
      return res.status(400).json({
        success: false,
        message: 'This passcode is already revoked.',
      });
    }

    const updated = await prisma.facultyPasscode.update({
      where: { id },
      data: { isRevoked: true },
      select: {
        id: true,
        code: true,
        isRevoked: true,
        department: true,
        targetRole: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Passcode ${updated.code} has been revoked.`,
      passcode: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to revoke passcode: ${error.message}`,
    });
  }
}

/**
 * Deletes a passcode permanently.
 * DELETE /api/admin/passcodes/:id
 * Access: HOD_ADMIN only (must own the passcode, and passcode must not have been consumed)
 */
async function deletePasscode(req, res) {
  try {
    const { id } = req.params;

    const passcode = await prisma.facultyPasscode.findUnique({
      where: { id },
      include: { consumedBy: { select: { id: true } } },
    });

    if (!passcode) {
      return res.status(404).json({
        success: false,
        message: 'Passcode not found.',
      });
    }

    if (passcode.createdById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete passcodes you created.',
      });
    }

    if (passcode.consumedBy.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a passcode that has already been consumed. Revoke it instead.',
      });
    }

    await prisma.facultyPasscode.delete({ where: { id } });

    return res.status(200).json({
      success: true,
      message: `Passcode ${passcode.code} has been permanently deleted.`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to delete passcode: ${error.message}`,
    });
  }
}

/**
 * Returns aggregate analytics for the admin's passcodes.
 * GET /api/admin/passcodes/stats
 * Access: HOD_ADMIN only
 */
async function getPasscodeStats(req, res) {
  try {
    const now = new Date();
    const allPasscodes = await prisma.facultyPasscode.findMany({
      where: { createdById: req.user.id },
      select: {
        isRevoked: true,
        expiresAt: true,
        maxUses: true,
        usedCount: true,
        department: true,
      },
    });

    let active = 0;
    let expired = 0;
    let revoked = 0;
    let exhausted = 0;
    let totalConsumed = 0;
    const departmentBreakdown = {};

    for (const p of allPasscodes) {
      totalConsumed += p.usedCount;

      if (!departmentBreakdown[p.department]) {
        departmentBreakdown[p.department] = { total: 0, active: 0, consumed: 0 };
      }
      departmentBreakdown[p.department].total++;
      departmentBreakdown[p.department].consumed += p.usedCount;

      if (p.isRevoked) {
        revoked++;
      } else if (p.expiresAt < now) {
        expired++;
      } else if (p.usedCount >= p.maxUses) {
        exhausted++;
      } else {
        active++;
        departmentBreakdown[p.department].active++;
      }
    }

    return res.status(200).json({
      success: true,
      stats: {
        total: allPasscodes.length,
        active,
        expired,
        revoked,
        exhausted,
        totalConsumed,
        departmentBreakdown,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to fetch stats: ${error.message}`,
    });
  }
}

module.exports = {
  createPasscodes,
  listPasscodes,
  revokePasscode,
  deletePasscode,
  getPasscodeStats,
};
