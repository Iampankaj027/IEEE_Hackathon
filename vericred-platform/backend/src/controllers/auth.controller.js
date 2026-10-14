const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

/**
 * Helper to generate a signed JWT token
 */
function generateAuthToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    rollNo: user.rollNo,
  };

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
  }

  // Token expires in 7 days
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

/**
 * Registers a new user (Student, Faculty, or HOD Admin)
 * POST /api/auth/register
 */
async function register(req, res) {
  try {
    const {
      name,
      email,
      password,
      role = 'STUDENT',
      rollNo,
      department,
      batchYear,
      currentSemester,
      section,
    } = req.body;

    // 1. Validation checks
    if (!name || !email || !password || !department) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, email, password, and department are mandatory.',
      });
    }

    // 1a. Strict role whitelist — prevent arbitrary role injection
    const ALLOWED_ROLES = ['STUDENT', 'FACULTY', 'HOD_ADMIN'];
    const normalizedRole = String(role).trim().toUpperCase();
    if (!ALLOWED_ROLES.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: `Invalid account role "${role}". Allowed roles: ${ALLOWED_ROLES.join(', ')}.`,
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRollNo = rollNo ? String(rollNo).trim().toUpperCase() : null;

    // 1b. Faculty / HOD_ADMIN Registration Gate — Database-Backed Passcode Validation
    let validatedPasscode = null;
    if (normalizedRole === 'FACULTY' || normalizedRole === 'HOD_ADMIN') {
      const { facultyPasscode } = req.body;
      if (!facultyPasscode || !String(facultyPasscode).trim()) {
        return res.status(403).json({
          success: false,
          message: 'An institutional faculty passcode is required to register as Faculty or HOD Admin. Contact your HOD or department coordinator.',
        });
      }

      const trimmedCode = String(facultyPasscode).trim();

      // Look up the passcode in the database
      const passcodeRecord = await prisma.facultyPasscode.findUnique({
        where: { code: trimmedCode },
      });

      if (!passcodeRecord) {
        return res.status(403).json({
          success: false,
          message: 'Invalid institutional faculty passcode. This code does not exist in our records. Contact your HOD or department coordinator.',
        });
      }

      // Check if revoked
      if (passcodeRecord.isRevoked) {
        return res.status(403).json({
          success: false,
          message: 'This passcode has been revoked by the administrator and can no longer be used.',
        });
      }

      // Check if expired
      if (passcodeRecord.expiresAt < new Date()) {
        return res.status(403).json({
          success: false,
          message: `This passcode expired on ${passcodeRecord.expiresAt.toISOString().split('T')[0]}. Request a new one from your HOD.`,
        });
      }

      // Check if exhausted (all uses consumed)
      if (passcodeRecord.usedCount >= passcodeRecord.maxUses) {
        return res.status(403).json({
          success: false,
          message: 'This passcode has reached its maximum usage limit. Request a new one from your HOD.',
        });
      }

      // Validate department scope — passcode must match the department being registered for
      if (passcodeRecord.department !== department.trim()) {
        return res.status(403).json({
          success: false,
          message: `This passcode is scoped to the "${passcodeRecord.department}" department. You selected "${department.trim()}". Please use a passcode issued for your department.`,
        });
      }

      // Validate target role — passcode must allow the requested role
      if (passcodeRecord.targetRole !== normalizedRole) {
        return res.status(403).json({
          success: false,
          message: `This passcode is configured for ${passcodeRecord.targetRole} registration, but you selected ${normalizedRole}. Contact your HOD for the correct passcode.`,
        });
      }

      // All checks passed — store for post-creation linking
      validatedPasscode = passcodeRecord;
    }

    // 2. Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address is already registered.',
      });
    }

    // 3. If student, ensure Roll Number is unique and provided
    if (normalizedRole === 'STUDENT') {
      if (!normalizedRollNo) {
        return res.status(400).json({
          success: false,
          message: 'Roll Number is required for student accounts.',
        });
      }

      const existingRoll = await prisma.user.findUnique({
        where: { rollNo: normalizedRollNo },
      });

      if (existingRoll) {
        return res.status(409).json({
          success: false,
          message: `Student with Roll Number ${normalizedRollNo} is already registered.`,
        });
      }
    }

    // 4. Hash password securely with bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 5. Create user in PostgreSQL via Prisma (with optional passcode linking)
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: normalizedRole,
        rollNo: normalizedRollNo,
        department: department.trim(),
        batchYear: batchYear ? parseInt(batchYear, 10) : null,
        currentSemester: currentSemester ? parseInt(currentSemester, 10) : 5,
        section: section ? section.trim() : 'A',
        ...(validatedPasscode ? { consumedPasscodeId: validatedPasscode.id } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        rollNo: true,
        department: true,
        batchYear: true,
        currentSemester: true,
        section: true,
        totalCreditPoints: true,
        createdAt: true,
      },
    });

    // 6. If faculty passcode was consumed, atomically increment the usage counter
    if (validatedPasscode) {
      await prisma.facultyPasscode.update({
        where: { id: validatedPasscode.id },
        data: {
          usedCount: { increment: 1 },
        },
      });
    }

    // 7. Generate JWT token
    const token = generateAuthToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: newUser,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Registration failed: ${error.message}`,
    });
  }
}

/**
 * Authenticates a user and issues a JWT token
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // 2. Verify password hash
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // 3. Generate token
    const token = generateAuthToken(user);

    // Omit password hash from response
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      rollNo: user.rollNo,
      department: user.department,
      batchYear: user.batchYear,
      currentSemester: user.currentSemester,
      section: user.section,
      totalCreditPoints: user.totalCreditPoints,
    };

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: userResponse,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Login failed: ${error.message}`,
    });
  }
}

/**
 * Returns current authenticated user profile
 * GET /api/auth/me
 */
async function getCurrentUser(req, res) {
  try {
    // req.user is attached by authenticateUser middleware
    return res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to fetch current user: ${error.message}`,
    });
  }
}

module.exports = {
  register,
  login,
  getCurrentUser,
};