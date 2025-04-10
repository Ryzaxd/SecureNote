const express = require('express');
const router = express.Router();
const db = require('../models');
const bcrypt = require('bcrypt');
const Users = db.Users;
const Notes = db.Notes;
const isAuthenticated = require('../utils/authentication');

/* GET home page. */
router.get('/', isAuthenticated, (req, res) => {
  res.render('index', { title: 'Securenote' });
});

/* GET create note. */
router.get('/note/create', isAuthenticated, (req, res) => {
  res.render('note/create', { title: 'Securenote' });
});

/* POST create note. */
router.post('/note/save', isAuthenticated, async (req, res) => {
  try {
    await Notes.create({
      title: req.body.title,
      note: req.body.note,
      user_id: req.session.user.id
    });
    res.redirect('/note/overview');
  } catch (err) {
    console.error('Error during note creation:', err);
    res.render('error', { title: 'Securenote', message: 'Internal Server Error' });
  }
});

/* GET note overview. */
router.get('/note/overview', isAuthenticated, async (req, res) => {
  try {
    const notes = await Notes.findAll({
      where: { user_id: req.session.user.id },
      order: [['createdAt', 'DESC']]
    });

    const formattedNotes = notes.map(note => ({
      ...note.toJSON(),
      formattedCreatedAt: note.createdAt.toLocaleString("da-DK", {
        year: "numeric", month: "numeric", day: "numeric"
      }).replace(/\./g, "-")
    }));

    res.render('note/overview', { title: 'Securenote', notes: formattedNotes });
  } catch (err) {
    console.error('Error fetching notes:', err);
    res.render('error', { title: 'Securenote', message: 'Internal Server Error' });
  }
});

/* GET show note. */
router.get('/note/show/:id', isAuthenticated, async (req, res) => {
  try {
    const note = await Notes.findOne({
      where: { id: req.params.id, user_id: req.session.user.id },
      include: [{ model: Users, attributes: ['username'] }]
    });

    if (!note) return res.status(404).render('error', { title: 'Securenote', message: 'Note not found' });

    res.render('note/show', {
      title: 'Securenote',
      note: {
        title: note.title,
        note: note.note,
        username: note.User.username || 'Unknown',
        formattedCreatedAt: note.createdAt.toLocaleString("da-DK", {
          year: "numeric", month: "numeric", day: "numeric"
        }).replace(/\./g, "-")
      }
    });
  } catch (err) {
    console.error('Error fetching note:', err);
    res.render('error', { title: 'Securenote', message: 'Internal Server Error' });
  }
});

/* GET edit note. */
router.get('/note/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const note = await Notes.findOne({ where: { id: req.params.id, user_id: req.session.user.id } });

    if (!note) return res.status(404).render('error', { title: 'Securenote', message: 'Note not found' });

    res.render('note/edit', { title: 'Securenote', note });
  } catch (err) {
    console.error('Error fetching note for edit:', err);
    res.render('error', { title: 'Securenote', message: 'Internal Server Error' });
  }
});

/* POST edit note. */
router.post('/note/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const noteId = parseInt(req.params.id, 10);
    const note = await Notes.findOne({ where: { id: noteId, user_id: req.session.user.id } });

    if (!note) return res.status(404).render('error', { title: 'Securenote', message: 'Note not found' });

    await Notes.update(
      { title: req.body.title, note: req.body.note },
      { where: { id: noteId, user_id: req.session.user.id } }
    );

    res.redirect('/note/overview');
  } catch (err) {
    console.error('Error updating note:', err);
    res.render('error', { title: 'Securenote', message: 'Internal Server Error' });
  }
});

/* DELETE note. */
router.post('/note/delete/:id', isAuthenticated, async (req, res) => {
  try {
    const note = await Notes.findOne({ where: { id: req.params.id, user_id: req.session.user.id } });

    if (!note) return res.status(404).render('error', { title: 'Securenote', message: 'Note not found' });

    await note.destroy();
    res.redirect('/note/overview');
  } catch (err) {
    console.error('Error deleting note:', err);
    res.render('error', { title: 'Securenote', message: 'Internal Server Error' });
  }
});

/* Shared note view */
router.get('/note/shared/:id', async (req, res) => {
  try {
    const note = await Notes.findOne({ where: { id: req.params.id } });

    if (!note) return res.status(404).render('error', { title: 'Securenote', message: 'Note not found' });

    res.render('note/show', {
      title: 'Shared Note',
      note: {
        title: note.title,
        note: note.note,
        username: 'Shared User',
        formattedCreatedAt: note.createdAt.toLocaleString("da-DK", {
          year: "numeric", month: "numeric", day: "numeric"
        }).replace(/\./g, "-"),
        isShared: true
      }
    });
  } catch (err) {
    console.error('Error fetching shared note:', err);
    res.render('error', { title: 'Securenote', message: 'Internal Server Error' });
  }
});

/* GET login */
router.get('/login', (req, res) => {
  res.render('login', { title: 'Securenote' });
});

// POST login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  console.log(`[LOGIN ATTEMPT] Username: ${username}`);

  try {
    const user = await Users.findOne({
      where: { username: username },
      attributes: ['id', 'username', 'password']
    });

    if (!user) {
      console.warn(`[LOGIN FAILED] User not found: ${username}`);
      return res.redirect('/login');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log(`[LOGIN VALIDATION] Password valid: ${isPasswordValid}`);

    if (isPasswordValid) {
      req.session.user = { id: user.id, username: user.username };

      req.session.save(err => {
        if (err) {
          console.error(`[SESSION SAVE ERROR] ${err}`);
          return res.render('error', { title: 'Securenote', message: 'Session Error' });
        }

        console.log(`[LOGIN SUCCESS] User ID: ${user.id}`);
        return res.redirect('/');
      });
    } else {
      console.warn(`[LOGIN FAILED] Invalid password for: ${username}`);
      return res.redirect('/login');
    }
  } catch (error) {
    console.error('[LOGIN ERROR]', error);
    res.render('error', { title: 'Securenote', message: 'Internal Server Error' });
  }
});

/* GET register */
router.get('/register', (req, res) => {
  res.render('register', { title: 'Securenote' });
});

/* POST register */
router.post('/register', async (req, res) => {
  try {
    const { username, firstName, lastName, email, password } = req.body;

    if (await Users.findOne({ where: { username } }) || await Users.findOne({ where: { email } })) {
      return res.redirect('/register');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await Users.create({ username, firstName, lastName, email, password: hashedPassword });

    req.session.user = { id: user.id, username: user.username };
    req.session.save(err => {
      if (err) throw err;
      res.redirect('/');
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.render('error', { title: 'Securenote', message: 'Internal Server Error' });
  }
});

/* POST logout */
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.render('error', { title: 'Securenote', message: 'Could not log out' });
    }
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

module.exports = router;
