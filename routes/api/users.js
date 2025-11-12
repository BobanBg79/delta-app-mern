const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/permission'); // Add permission middleware

const User = require('../../models/User');
const Role = require('../../models/Role');
const KontoService = require('../../services/accounting/KontoService');
const { CASH_REGISTER_ROLES } = require('../../constants/userRoles');

// @route    POST api/users/register
// @desc     Create user
// @access   Private (Requires CAN_CREATE_USER permission)
router.post(
  '/register',
  auth, // First authenticate the user
  requirePermission('CAN_CREATE_USER'), // Then check for permission
  check('username', 'Username must be a valid email').isEmail(),
  check('fname', 'First name is required').notEmpty().trim(),
  check('lname', 'Last name is required').notEmpty().trim(),
  check(
    'password',
    'Password must be at least 8 characters with at least one uppercase letter and one special character'
  )
    .isLength({ min: 8 })
    .matches(/^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
    .withMessage('Password must contain at least one uppercase letter and one special character'),
  check('role', 'Role ID is required').notEmpty().isMongoId(),
  // check('employeeId', 'Employee ID must be a valid ObjectId').optional().isMongoId(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, fname, lname, role, employeeId } = req.body;

    try {
      // Check if user already exists
      let user = await User.findOne({ username });

      if (user) {
        return res.status(400).json({ errors: [{ msg: 'User already exists' }] });
      }

      // Verify the role exists in the database
      const roleFromDB = await Role.findById(role);

      if (!roleFromDB) {
        return res.status(400).json({
          errors: [{ msg: 'Role not found in database' }]
        });
      }

      const userData = {
        username,
        password,
        fname,
        lname,
        role, // Use the role ID directly
        createdBy: req.user.id, // Use the authenticated user's ID
      };

      // Only add employeeId if it's provided
      if (employeeId) {
        userData.employeeId = employeeId;
      }

      user = new User(userData);

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      await user.save();

      // Auto-create cash register if user role requires it
      let cashRegister = null;
      if (CASH_REGISTER_ROLES.includes(roleFromDB.name)) {
        try {
          cashRegister = await KontoService.createCashRegisterForUser(user._id);
          console.log(`✅ Auto-created cash register for new user: ${user.fname} ${user.lname}`);
        } catch (cashRegisterError) {
          console.error('Failed to create cash register for user:', cashRegisterError.message);
          // Rollback user creation if cash register creation fails
          await User.findByIdAndDelete(user._id);
          return res.status(500).json({
            errors: ['User creation failed: Could not create required cash register']
          });
        }
      }

      // Auto-create additional kontos for CLEANING_LADY (non-blocking - log error but don't fail request)
      let cleaningLadyKontos = null;
      if (roleFromDB.name === 'CLEANING_LADY') {
        try {
          cleaningLadyKontos = await KontoService.createKontosForCleaningLady(user._id, user.fname, user.lname);
          console.log(`✅ Auto-created kontos for cleaning lady: ${user.fname} ${user.lname}`);
        } catch (cleaningLadyError) {
          // Log error but don't fail user creation
          console.error(`⚠️  Failed to create kontos for cleaning lady ${user.fname} ${user.lname}:`, cleaningLadyError.message);
          console.error('   Kontos can be created later via sync process (runs on server restart/reconnect to database)');
        }
      }

      // Don't generate a token for the new user, just return success
      const { password: _, ...responseUser } = user._doc;
      res.status(201).json({
        message: 'User created successfully',
        user: responseUser,
        cashRegister: cashRegister ? {
          code: cashRegister.code,
          name: cashRegister.name
        } : null,
        cleaningLadyKontos: cleaningLadyKontos ? {
          payables: {
            code: cleaningLadyKontos.payablesKonto.code,
            name: cleaningLadyKontos.payablesKonto.name
          },
          netSalary: {
            code: cleaningLadyKontos.netSalaryKonto.code,
            name: cleaningLadyKontos.netSalaryKonto.name
          }
        } : null
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route    GET api/users
// @desc     Get all users with optional role filter
// @access   Private (Requires CAN_VIEW_USER permission)
router.get(
  '/',
  auth, // First authenticate the user
  requirePermission('CAN_VIEW_USER'), // Changed from CAN_VIEW_USERS to CAN_VIEW_USER
  async (req, res) => {
    try {
      const { role, includeInactive } = req.query;

      let query = {};

      // By default, only return active users (or users without isActive field - legacy users)
      // Only exclude users that are explicitly deactivated (isActive: false)
      if (includeInactive !== 'true') {
        query.isActive = { $ne: false };
      }

      // If role filter is provided, find users with that role
      if (role) {
        const roleDoc = await Role.findOne({ name: role.toUpperCase() });
        if (roleDoc) {
          query.role = roleDoc._id;
        } else {
          // If role doesn't exist, return empty array
          return res.json({
            message: 'No users found with specified role',
            count: 0,
            users: [],
          });
        }
      }

      // Get users based on query and populate role information, exclude passwords
      const users = await User.find(query)
        .select('-password') // Exclude password field
        .populate('role', 'name description') // Populate role with name and description
        .populate('createdBy', 'username') // Populate who created the user
        .sort({ createdAt: -1 }); // Sort by newest first

      res.json({
        message: 'Users retrieved successfully',
        count: users.length,
        users,
      });
    } catch (err) {
      console.error('Get users error:', err.message);
      res.status(500).json({
        errors: [{ msg: 'Server error while retrieving users' }],
      });
    }
  }
);

// @route    GET api/users/:id
// @desc     Get user by ID
// @access   Private (Requires CAN_VIEW_USER permission)
router.get(
  '/:id',
  auth, // First authenticate the user
  requirePermission('CAN_VIEW_USER'), // Then check for permission
  check('id', 'Invalid user ID').isMongoId(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.params.id)
        .select('-password') // Exclude password field
        .populate('role', 'name description permissions') // Populate role with name, description and permissions
        .populate('createdBy', 'username'); // Populate who created the user

      if (!user) {
        return res.status(404).json({
          errors: [{ msg: 'User not found' }],
        });
      }

      res.json({
        message: 'User retrieved successfully',
        user,
      });
    } catch (err) {
      console.error('Get user by ID error:', err.message);

      // Handle invalid ObjectId format
      if (err.kind === 'ObjectId') {
        return res.status(404).json({
          errors: [{ msg: 'User not found' }],
        });
      }

      res.status(500).json({
        errors: [{ msg: 'Server error while retrieving user' }],
      });
    }
  }
);

// @route    PUT api/users/:id
// @desc     Update user (complete replacement)
// @access   Private (Requires CAN_UPDATE_USER permission)
router.put(
  '/:id',
  auth,
  requirePermission('CAN_UPDATE_USER'),
  check('id', 'Invalid user ID').isMongoId(),
  check('username', 'Username must be a valid email').isEmail(),
  check('fname', 'First name is required').notEmpty().trim(),
  check('lname', 'Last name is required').notEmpty().trim(),
  check('role', 'Role ID is required').notEmpty().isMongoId(),
  check('isActive', 'isActive is required').notEmpty().isBoolean(),
  check('employeeId', 'Employee ID must be a valid ObjectId').optional().isMongoId(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { username, fname, lname, role, isActive, employeeId } = req.body;

      // Check if user exists
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({
          errors: [{ msg: 'User not found' }],
        });
      }

      // Prevent self-deactivation
      if (isActive === false && req.params.id === req.user.id) {
        return res.status(400).json({
          errors: [{ msg: 'You cannot deactivate yourself' }],
        });
      }

      // If username is being changed, check if it's already taken
      if (username !== user.username) {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
          return res.status(400).json({
            errors: [{ msg: 'Username already exists' }],
          });
        }
      }

      // Verify role exists
      const roleFromDB = await Role.findById(role);
      if (!roleFromDB) {
        return res.status(400).json({
          errors: [{ msg: 'Role not found in database' }],
        });
      }

      // Update user with all fields
      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            username,
            fname,
            lname,
            role,
            isActive,
            employeeId: employeeId || null,
          },
        },
        { new: true, runValidators: true }
      )
        .select('-password')
        .populate('role', 'name description permissions')
        .populate('createdBy', 'username');

      // Ensure user has all required kontos based on their (potentially new) role
      let kontosResult = null;
      try {
        kontosResult = await KontoService.ensureUserKontos(updatedUser._id);

        if (kontosResult.errors.length > 0) {
          console.error(`⚠️  Some kontos could not be created for ${updatedUser.fname} ${updatedUser.lname}:`, kontosResult.errors);
          console.error('   Missing kontos can be created later via sync process (runs on server restart/reconnect to database)');
        }
      } catch (kontosError) {
        console.error(`⚠️  Error ensuring kontos for ${updatedUser.fname} ${updatedUser.lname}:`, kontosError.message);
      }

      res.json({
        message: 'User updated successfully',
        user: updatedUser
      });
    } catch (err) {
      console.error('Update user error:', err.message);

      if (err.kind === 'ObjectId') {
        return res.status(404).json({
          errors: [{ msg: 'User not found' }],
        });
      }

      res.status(500).json({
        errors: [{ msg: 'Server error while updating user' }],
      });
    }
  }
);

module.exports = router;
