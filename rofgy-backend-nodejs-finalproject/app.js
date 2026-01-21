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

function requireAuth(req, res, next) {
  const token = req.session.token; // Retrieve token from session

  if (!token) return res.redirect('/login'); // If no token, redirect to login page

  try {
    const decoded = jwt.verify(token, SECRET_KEY); // Verify the token using the secret key
    req.user = decoded; // Attach decoded user data to the request
    next(); // Pass control to the next middleware/route
  } catch (error) {
    return res.redirect('/login'); // If token is invalid, redirect to login page
  }
}

// Insert your routing HTML code here.
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html'))); // Serve the home page HTML.
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html'))); // Serve the registration page HTML.
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html'))); // Serve the login page HTML.
app.get('/post', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'post.html'))); // Serve the post page HTML only for authenticated users.
app.get('/index', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html'), { username: req.user.username })); // Serve the index page with user context after authentication.

// Insert your user registration code here.
app.post('/register', async (req, res) => { // Handle user registration requests.
  const { username, email, password } = req.body; // Extract registration fields from the request body.

  try { // Start registration flow with error handling.
    // Check if the user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] }); // Look up any user with the same username or email.

    if (existingUser) return res.status(400).json({ message: 'User already exists' }); // Reject duplicate registrations.

    // Create and save the new user
    const newUser = new User({ username, email, password }); // Create a new user document.
    await newUser.save(); // Persist the new user to the database.

    // Generate JWT token and store in session
    const token = jwt.sign({ userId: newUser._id, username: newUser.username }, SECRET_KEY, { expiresIn: '1h' }); // Sign a JWT with a 1-hour expiration.
    req.session.token = token; // Store the token in the session for later authentication.

    // Respond with success message
    res.send({ message: `The user ${username} has been added` }); // Send a success response.
  } catch (error) { // Catch and handle any registration errors.
    console.error(error); // Log the error for debugging.
    // Handle server errors
    res.status(500).json({ message: 'Internal Server Error' }); // Return a generic server error response.
  }
}); // End the registration route.

// Insert your user login code here.

// Insert your post creation code here.

// Insert your post updation code here.

// Insert your post deletion code here.

// Insert your user logout code here.

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
