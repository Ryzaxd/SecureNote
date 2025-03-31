
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

const app = express();

var indexRouter = require('./routes/index');

app.use(express.static(path.join(__dirname, 'public')));


// Initialize SequelizeStore with the sequelize instance
const sessionStore = new SequelizeStore({
  db: db.sequelize, 
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.set("trust proxy", 1);

// Session setup
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
      maxAge: 24*3600000
    },
  })
);

// Middleware setups
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// Routes setup
app.use('/', indexRouter);
app.use('/note/create', indexRouter);
app.use('/note/overview', indexRouter);
app.use('/note/show', indexRouter);
app.use('/note/edit', indexRouter);

app.use('/login', indexRouter);
app.use('/register', indexRouter);
app.use('/logout', indexRouter);

// Sync session store
sessionStore.sync();

// Sync database and start server
db.sequelize.sync().then(() => {
  const port = process.env.PORT || 8080;
  const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });

  // Close the server if needed
  process.on('SIGINT', () => {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}).catch(error => {
  console.error('Unable to connect to the database:', error);
  process.exit(1);
});

// Catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function(err, req, res, next) {
  // Set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Set title
  res.locals.title = 'Error';

  // Render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;