const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const express = require('express');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key';

mongoose.set('strictQuery', false);

const mongoUser = process.env.MONGO_USERNAME || 'root';
const mongoPassword = process.env.MONGO_PASSWORD || '<replace password>';
const mongoHost = process.env.MONGO_HOST || 'localhost';
const mongoPort = process.env.MONGO_PORT || '27017';
const mongoDb = process.env.MONGO_DB || 'SocialDB';
const mongoCommand = process.env.MONGO_COMMAND || '';
const mongoUriFromCommand = mongoCommand.startsWith('mongosh ')
  ? mongoCommand.replace(/^mongosh\s+/, '')
  : mongoCommand;
const uri = mongoUriFromCommand || `mongodb://${mongoUser}:${mongoPassword}@${mongoHost}:${mongoPort}/${mongoDb}`;
mongoose.connect(uri, { dbName: mongoDb });

const User = mongoose.model('User', { username: String, email: String, password: String });
const Post = mongoose.model('Post', { userId: mongoose.Schema.Types.ObjectId, text: String });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: SECRET_KEY, resave: false, saveUninitialized: true, cookie: { secure: false } }));


function authenticateJWT(req, res, next) {
  // Get token from session
  const token = req.session.token;

  // If no token, return 401 Unauthorized
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    // Verify token
    const decoded = jwt.verify(token, SECRET_KEY);

    // Attach user data to request
    req.user = decoded;

    // Continue to the next middleware
    next();
  } catch (error) {
    // If invalid token, return 401
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Insert your requireAuth Function code here.

// Insert your routing HTML code here.

// Insert your user registration code here.

// Insert your user login code here.

// Insert your post creation code here.

// Insert your post updation code here.

// Insert your post deletion code here.

// Insert your user logout code here.

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
