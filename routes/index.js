const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  db.all("SELECT * FROM notes ORDER BY id DESC", [], (err, notes) => {
    if (err) return res.status(500).send("Database error");
    res.render('index', { title: 'Notes', notes });
  });
});

router.post('/save', (req, res) => {
  const { title, text } = req.body;
  if (!title.trim()) return res.json({ error: 'Title required' });

  db.run("INSERT INTO notes (title, text) VALUES (?, ?)", [title, text], function (err) {
    if (err) return res.status(500).json({ error: "Save failed" });
    res.json({ success: true, id: this.lastID });
  });
});

router.get('/note/:id', (req, res) => {
  db.get("SELECT * FROM notes WHERE id = ?", [req.params.id], (err, note) => {
    if (err || !note) return res.status(404).send("Note not found");
    res.render('note', { title: note.title, note });
  });
});


router.delete('/delete/:id', (req, res) => {
  db.run("DELETE FROM notes WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: "Delete failed" });
    res.json({ success: true });
  });
});

module.exports = router;
