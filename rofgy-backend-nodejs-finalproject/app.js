const path = require('path'); // Load path utilities for filesystem paths.
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') }); // Load environment variables from the repo .env file.
const express = require('express'); // Import Express framework.
const jwt = require('jsonwebtoken'); // Import JSON Web Token utilities.
const session = require('express-session'); // Import session middleware.
const mongoose = require('mongoose'); // Import Mongoose ODM.

const app = express(); // Create the Express application instance.
const PORT = process.env.PORT || 3000; // Read the server port from env or default to 3000.
const SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key'; // Read the secret key from env or use a fallback.

mongoose.set('strictQuery', false); // Allow flexible query filters in Mongoose.

const mongoUser = process.env.MONGO_USERNAME || 'root'; // Read MongoDB username from env.
const mongoPassword = process.env.MONGO_PASSWORD || '<replace password>'; // Read MongoDB password from env.
const mongoHost = process.env.MONGO_HOST || 'localhost'; // Read MongoDB host from env.
const mongoPort = process.env.MONGO_PORT || '27017'; // Read MongoDB port from env.
const mongoDb = process.env.MONGO_DB || 'SocialDB'; // Read MongoDB database name from env.
const mongoCommand = process.env.MONGO_COMMAND || ''; // Read optional mongosh command from env.
const mongoUriFromCommand = mongoCommand.startsWith('mongosh ') // Detect a mongosh command prefix.
  ? mongoCommand.replace(/^mongosh\s+/, '') // Strip mongosh to keep only the URI.
  : mongoCommand; // Use the command value as-is if it's already a URI.
const uri = mongoUriFromCommand || `mongodb://${mongoUser}:${mongoPassword}@${mongoHost}:${mongoPort}/${mongoDb}`; // Build MongoDB connection URI.
mongoose.connect(uri, { dbName: mongoDb }); // Connect to MongoDB using Mongoose.

const User = mongoose.model('User', { username: String, email: String, password: String }); // Define the User model.
const Post = mongoose.model('Post', { userId: mongoose.Schema.Types.ObjectId, text: String }); // Define the Post model.

app.use(express.json()); // Enable JSON body parsing.
app.use(express.urlencoded({ extended: true })); // Enable URL-encoded body parsing.
app.use(session({ secret: SECRET_KEY, resave: false, saveUninitialized: true, cookie: { secure: false } })); // Configure session handling.


function authenticateJWT(req, res, next) { // Middleware to authenticate users using a JWT stored in the session.
  // Get token from session
  const token = req.session.token; // Read the token from the session.

  // If no token, return 401 Unauthorized
  if (!token) return res.status(401).json({ message: 'Unauthorized' }); // Reject requests without a token.

  try { // Attempt to verify the provided token.
    // Verify token
    const decoded = jwt.verify(token, SECRET_KEY); // Verify the token using the secret key.

    // Attach user data to request
    req.user = decoded; // Attach decoded user data to the request.

    // Continue to the next middleware
    next(); // Continue to the next middleware.
  } catch (error) { // Handle token verification failures.
    // If invalid token, return 401
    return res.status(401).json({ message: 'Invalid token' }); // Reject invalid or expired tokens.
  } // End token verification block.
} // End authenticateJWT middleware.
// Insert your requireAuth Function code here.

function requireAuth(req, res, next) { // Middleware to enforce authentication for HTML routes.
  const token = req.session.token; // Retrieve token from session

  if (!token) return res.redirect('/login'); // If no token, redirect to login page

  try { // Verify the token and proceed if valid.
    const decoded = jwt.verify(token, SECRET_KEY); // Verify the token using the secret key
    req.user = decoded; // Attach decoded user data to the request
    next(); // Pass control to the next middleware/route
  } catch (error) { // Handle invalid or expired tokens.
    return res.redirect('/login'); // If token is invalid, redirect to login page
  } // End token validation block.
} // End requireAuth middleware.

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
  } // End registration error handling block.
}); // End the registration route.

// Insert your user login code here.
app.post('/login', async (req, res) => { // Handle user login requests.
  const { username, password } = req.body; // Extract login credentials from the request body.

  try { // Start login flow with error handling.
    // Check if the user exists with the provided credentials
    const user = await User.findOne({ username, password }); // Find a matching user by username and password.

    if (!user) return res.status(401).json({ message: 'Invalid credentials' }); // Reject invalid login attempts.

    // Generate JWT token and store in session
    const token = jwt.sign({ userId: user._id, username: user.username }, SECRET_KEY, { expiresIn: '1h' }); // Sign a JWT with a 1-hour expiration.
    req.session.token = token; // Store the token in the session for later authentication.

    // Respond with a success message
    res.send({ message: `${user.username} has logged in` }); // Send a successful login response.
  } catch (error) { // Catch and handle any login errors.
    console.error(error); // Log the error for debugging.
    // Handle server errors
    res.status(500).json({ message: 'Internal Server Error' }); // Return a generic server error response.
  } // End login error handling block.
}); // End the login route.

// Insert your post creation code here.
app.post('/post', authenticateJWT, async (req, res) => { // Handle post creation requests for authenticated users.
  const { text } = req.body; // Extract post text from the request body.

  // Validate post content
  if (!text || typeof text !== 'string') { // Ensure the post text is present and a string.
    return res.status(400).json({ message: 'Please provide valid post content' }); // Reject invalid post content.
  } // End post content validation block.

  try { // Start post creation flow with error handling.
    // Create and save new post with userId
    const newPost = new Post({ userId: req.user.userId, text }); // Create a post tied to the authenticated user.
    await newPost.save(); // Persist the new post to the database.
    res.status(201).json({ message: 'Post created successfully', post: newPost }); // Respond with the created post.
  } catch (error) { // Catch and handle any post creation errors.
    console.error(error); // Log the error for debugging.
    res.status(500).json({ message: 'Internal Server Error' }); // Return a generic server error response.
  } // End post creation error handling block.
}); // End the post creation route.

// Get all posts for the authenticated user
app.get('/posts', authenticateJWT, async (req, res) => { // Handle requests to fetch posts for authenticated users.
  try { // Start posts retrieval flow with error handling.
    // Fetch posts for the logged-in user
    const posts = await Post.find({ userId: req.user.userId }); // Query posts for the current user.
    res.json({ posts }); // Return the user's posts.
  } catch (error) { // Catch and handle any retrieval errors.
    console.error(error); // Log the error for debugging.
    res.status(500).json({ message: 'Internal Server Error' }); // Return a generic server error response.
  } // End posts retrieval error handling block.
}); // End the posts retrieval route.

// Insert your post updation code here.
app.put('/posts/:postId', authenticateJWT, async (req, res) => { // Handle post update requests for authenticated users.
  const postId = req.params.postId; // Extract post ID from route params.
  const { text } = req.body; // Extract updated text from the request body.

  try { // Start post update flow with error handling.
    // Find and update the post, ensuring it's owned by the authenticated user
    const post = await Post.findOneAndUpdate( // Find and update the target post.
      { _id: postId, userId: req.user.userId }, // Match the post by ID and owner.
      { text }, // Apply the updated text.
      { new: true } // Return updated post.
    ); // Finish the update query.

    // Return error if post not found
    if (!post) return res.status(404).json({ message: 'Post not found' }); // Handle missing posts.

    res.json({ message: 'Post updated successfully', updatedPost: post }); // Respond with the updated post.
  } catch (error) { // Catch and handle any update errors.
    console.error(error); // Log the error for debugging.
    res.status(500).json({ message: 'Internal Server Error' }); // Return a generic server error response.
  } // End post update error handling block.
}); // End the post update route.

// Insert your post deletion code here.
app.delete('/posts/:postId', authenticateJWT, async (req, res) => { // Handle post deletion requests for authenticated users.
  const postId = req.params.postId; // Extract post ID from route params.

  try { // Start post deletion flow with error handling.
    // Find and delete the post, ensuring it's owned by the authenticated user
    const post = await Post.findOneAndDelete({ _id: postId, userId: req.user.userId }); // Delete the post if it belongs to the user.

    // Return error if post not found
    if (!post) return res.status(404).json({ message: 'Post not found' }); // Handle missing posts.

    res.json({ message: 'Post deleted successfully', deletedPost: post }); // Respond with the deleted post.
  } catch (error) { // Catch and handle any deletion errors.
    console.error(error); // Log the error for debugging.
    res.status(500).json({ message: 'Internal Server Error' }); // Return a generic server error response.
  } // End post deletion error handling block.
}); // End the post deletion route.

// Insert your user logout code here.
app.get('/logout', (req, res) => { // Handle logout requests.
  req.session.destroy((err) => { // Destroy the session to clear authentication data.
    if (err) console.error(err); // Log any session destruction errors.
    res.redirect('/login'); // Redirect to login page after logout.
  }); // Finish session destruction callback.
}); // End the logout route.

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`)); // Start the server and log the active port.
