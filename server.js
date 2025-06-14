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
