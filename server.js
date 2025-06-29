const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const path = require('path');

const app = express();

// Connect Database
connectDB();

app.use(express.json());

if (process.env.NODE_ENV !== 'production') {
  app.use(cors({ origin: 'http://localhost:3000' }));
}

app.use('/api/users', require('./routes/api/users'));
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/apartments', require('./routes/api/apartments'));
app.use('/api/reservations', require('./routes/api/reservations'));
app.use('/api/guests', require('./routes/api/guests'));
app.use('/api/booking-agents', require('./routes/api/booking-agents'));
// Add these new routes
app.use('/api/roles', require('./routes/api/roles'));
app.use('/api/permissions', require('./routes/api/permissions'));

// Add this debug route alongside your existing permissions debug route
app.get('/api/debug/roles', async (req, res) => {
  try {
    const Role = require('./models/Role');
    const roles = await Role.find({}).populate('permissions', 'name').sort({ name: 1 });
    res.json({
      count: roles.length,
      roles: roles.map((r) => ({
        name: r.name,
        isEmployeeRole: r.isEmployeeRole,
        permissionCount: r.permissions.length,
        permissions: r.permissions.map((p) => p.name),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static('client/build'));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
