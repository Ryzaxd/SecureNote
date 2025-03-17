const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const indexRouter = require('./routes/index');

app.use(express.static(path.join(__dirname, 'public'))); 

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/', indexRouter);

module.exports = app;
