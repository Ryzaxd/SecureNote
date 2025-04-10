const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const bodyParser = require('body-parser');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const db = require('./models');
const bcrypt = require('bcrypt');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Setup session store after db is loaded
const sessionStore = new SequelizeStore({ db: db.sequelize });

// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.set('trust proxy', 1);

// Sessions
app.use(
  session({
    secret: 'your-random-secret-key',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      domain: 'localhost',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 3600000
    }
  })
);

// Routes
const indexRouter = require('./routes/index');
app.use('/', indexRouter);
app.use('/note', indexRouter);
app.use('/login', indexRouter);
app.use('/register', indexRouter);
app.use('/logout', indexRouter);

sessionStore.sync().catch(err => {
  console.error('SessionStore sync failed:', err);
});

// Error handling
app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
