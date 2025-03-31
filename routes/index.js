var express = require('express');
var router = express.Router();
var sqlite3 = require('sqlite3').verbose();
var db = require('../models');
const bcrypt = require('bcrypt');
const Users = require('../models').Users; 
const Notes = require('../models').Notes;
const isAuthenticated = require('../utils/authentication');

/* GET home page. */
router.get('/', isAuthenticated, function(req, res, next) {
  res.render('index', { title: 'Securenote' });
});

/* GET create note. */
router.get('/note/create', isAuthenticated, function(req, res, next) {
  res.render('note/create', { title: 'Securenote' });
});

/* POST create note. */
router.post('/note/save', isAuthenticated, async function(req, res, next) {
  try {
    await Notes.create({
      title: req.body.title,
      note: req.body.note,
      user_id: req.session.user.id
    });
    res.redirect('/note/overview');
  } catch (error) {
    console.error('Error during note creation:', error);
    res.render('error', { title: 'Securenote', message: 'Internal Server Error' });
  }
});

/* GET note overview. */
router.get('/note/overview', isAuthenticated, async function(req, res, next) {
  try {
    const notes = await Notes.findAll({
      where: { user_id: req.session.user.id },
      order: [['createdAt', 'DESC']]
    });

    // Format the createdAt field for each note
    const formattedNotes = notes.map(note => ({
      ...note.toJSON(),
      formattedCreatedAt: note.createdAt.toLocaleString("da-DK", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      }).replace(/\./g, "-")
    }));

    res.render('note/overview', { title: 'Securenote', notes: formattedNotes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.render('error', { title: 'Securenote', message: 'Internal Server Error' });
  }
});

/* GET show note. */
router.get('/note/show/:id', isAuthenticated, async function(req, res, next) {
  try {
    const noteId = req.params.id;
    const note = await Notes.findOne({
      where: { id: noteId, user_id: req.session.user.id },
      include: [{ model: Users, attributes: ['username'] }] 
    });

    if (!note) {
      return res.status(404).render('error', { title: 'Securenote', message: 'Note not found' });
    }

    res.render('note/show', { 
      title: 'Securenote', 
      note: {
        title: note.title,
        note: note.note, // Use `note` instead of `content` to match the template
        username: note.User.username || 'Unknown', // Pass `username` directly
        formattedCreatedAt: note.createdAt.toLocaleString("da-DK", {
          year: "numeric",
          month: "numeric",
          day: "numeric",
        }).replace(/\./g, "-"),
      } 
    });
  } catch (error) {
    console.error('Error fetching note:', error);
    res.render('error', { title: 'Securenote', message: 'Internal Server Error' });
  }
});

/* GET edit note. */
router.get('/note/edit/:id', isAuthenticated, async function(req, res, next) {
  try {
    const noteId = req.params.id;
    const note = await Notes.findOne({ where: { id: noteId, user_id: req.session.user.id } });

    if (!note) {
      return res.status(404).render('error', { title: 'Securenote', message: 'Note not found' });
    }

    res.render('note/edit', { title: 'Securenote', note: note });
  } catch (error) {
    console.error('Error fetching note for edit:', error);
    res.render('error', { title: 'Securenote', message: 'Internal Server Error' });
  }
});

/* POST edit note. */
router.post('/note/edit/:id', isAuthenticated, async function(req, res, next) {
  try {
    const noteId = req.params.id;
    const note = await Notes.findOne({ where: { id: noteId, user_id: req.session.user.id } });

    if (!note) {
      return res.status(404).render('error', { title: 'Securenote', message: 'Note not found' });
    }

    // Update the note fields
    await Notes.update(
      { title: req.body.title, note: req.body.note },
      { where: { id: noteId, user_id: req.session.user.id } }
    );

    res.redirect('/note/overview');
  } catch (error) {
    console.error('Error updating note:', error);
    res.render('error', { title: 'Securenote', message: 'Internal Server Error' });
  }
});

/* DELETE note. */
router.post('/note/delete/:id', isAuthenticated, async function(req, res, next) {
  try {
    const noteId = req.params.id;
    const note = await Notes.findOne({ where: { id: noteId, user_id: req.session.user.id } });

    if (!note) {
      return res.status(404).render('error', { title: 'Securenote', message: 'Note not found' });
    }

    await note.destroy();
    res.redirect('/note/overview');
  } catch (error) {
    console.error('Error deleting note:', error);
    res.render('error', { title: 'Securenote', message: 'Internal Server Error' });
  }
});


/*router.get('/note/:id', (req, res) => {
  db.get("SELECT * FROM notes WHERE id = ?", [req.params.id], (err, note) => {
    if (err || !note) return res.status(404).send("Note not found");
    res.render('note', { title: note.title, note });
  });
});

router.post('/delete/:id', (req, res) => {
  db.run("DELETE FROM notes WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: "Delete failed" });
    res.redirect('/mynotes');
  });
});

router.get('/mynotes', (req, res) => {
  db.all("SELECT * FROM notes ORDER BY id DESC", [], (err, notes) => {
    if (err) return res.status(500).send("Database error");
    res.render('myNotes', { title: 'Mine Noter', notes });
  });
}); */

// GET login
router.get('/login', (req, res) => {
  res.render('login', { title: 'Securenote' });
});

// POST login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await Users.findOne({ where: { username: username }, attributes: ['id', 'username', 'password'] });

    if (!user) {
      // User not found
      console.log('User not found');
      return res.redirect('/login');
    }

    const isPasswordValid = password === user.password;
    console.log('Password valid:', isPasswordValid);

    if (isPasswordValid) {
      req.session.user = { id: user.id, username: user.username };
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.render('error', { title: 'Securenote', message: 'Internal Server Error' });
        }
        return res.redirect('/');
      });
    } else {
      console.log('Invalid password');
      return res.redirect('/login');
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.render('error', { title: 'Securenote', message: 'Internal Server Error' });
  }
});

// GET register
router.get('/register', (req, res) => {
  res.render('register', { title: 'Securenote' });
});

// POST register
router.post('/register', async (req, res) => {
  const { username, firstName, lastName, email, password } = req.body;

  try {
    // Check if the username or email already exists
    const existingUser = await Users.findOne({ where: { username: username } });
    if (existingUser) {
      console.log('Username already exists');
      return res.redirect('/register');
    }

    const existingEmail = await Users.findOne({ where: { email: email } });
    if (existingEmail) {
      console.log('Email already exists');
      return res.redirect('/register');
    }

    // Create a new user
    const newUser = await Users.create({
      username: username,
      firstName: firstName,
      lastName: lastName,
      email: email,
      password: password
    });

    // Set the session and redirect to the home page
    req.session.user = { id: newUser.id, username: newUser.username };
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.render('error', { title: 'Securenote', message: 'Internal Server Error' });
      }
      return res.redirect('/');
    });
  } catch (error) {
    console.error('Error during registration:', error);
    res.render('error', { title: 'Securenote', message: 'Internal Server Error' });
  }
});

module.exports = router;