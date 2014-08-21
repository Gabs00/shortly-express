var express = require('express');
var session = require('express-session');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var auth = require('./app/helpers/auth-helpers.js');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.use(session({secret: 'keyboard cat'}));

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());

// Parse JSON (uniform resource locators)
app.use(bodyParser.json());

app.use('/', function(req, res, next) {
  if ( !req.url.match(/^\/(login|signup)/) ) {
      console.log(req.url);
    if ( req.session.user ) {
      next();
    } else {
      req.session.error = 'Access Denied!';
      res.redirect('/login');
    }
  } else {
    next();
  }
});


// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));


app.get('/', 
function(req, res) {
  res.render('index');
});

app.get('/create', 
function(req, res) {
  res.render('index');
});

app.get('/links', 
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.get('/login', function(req, res) {
  res.render('login');
});

app.post('/login', function(req, res) {
  var data = req.body;
  // check to see if user exists
  new User({username: data.username}).fetch().then(function(found) {
    if (found) {
      var temp = new User(data)
      if ( temp.get('password') === found.get('password') ) {
        req.session.user = found.get('username');
        res.redirect('/');
      } else {
        res.redirect('/login');
      }
    } else {
      res.redirect('/login');
      
    }
  });
  // if not, so sorry
  // if it does, compare passwords
});

app.get('/signup', function(req, res) {
  res.render('signup');
});

app.post('/signup', function(req, res) {
  var data = req.body;
  var valid = auth.validateNewUser(data);
  if(valid){
    //do some sql
    new User({username:data.username}).fetch().then(function(found){
      if(found){
        //respond tht usrnam is taken
      } else {
        //do stuff
        var user = new User(data);
        user.save().then(function(newUser){
          req.session.user = newUser.get('username');
          res.redirect('/');
        });
      }
    });
  } else {
    res.writeHead(400);
    res.end('Invalid username or password');
  }
});
/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
