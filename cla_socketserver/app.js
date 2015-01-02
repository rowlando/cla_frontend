'use strict';


var app = require('express')()
  , _ = require('underscore')._
  , server = require('http').Server(app)
  , io = require('socket.io')(server)
  , nsp = io.of('/socket.io')
  , cookie = require('cookie')
  , http = require('http')
  , querystring = require('querystring')
  , Promise = require('promise')
  , bodyParser = require('body-parser')
  , peopleManager = require('./utils/peopleManager')
  , adminApp = require('./admin')
  , StatsD = require('node-statsd').StatsD
  , statsd = new StatsD({
      host: process.env.STATSD_HOST || 'localhost',
      post: process.env.STATSD_POST || 8125
    })
  , versions = [];

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
server.listen(8005);

app.use(function(err, req, res, next){
  // we may use properties of the error object
  // here and next(err) appropriately, or if
  // we possibly recovered from the error, simply next().
  res.status(err.status || 500);
  res.render('error', { error: err });
});

// ADMIN

adminApp.install(app, nsp);


// SOCKETS

function sendConnStats() {
  // console.log('sending to statsd people count: '+peopleManager.getPeopleCount());
  statsd.gauge('people_connected', peopleManager.getPeopleCount());

  var versionCounts = peopleManager.getVersionCounts(),
      connectedVersions = [];

  _.each(versionCounts, function(value, key) {
    // storing the versions
    if (versions.indexOf(key) < 0) { versions.push(key); }
    if (connectedVersions.indexOf(key) < 0) { connectedVersions.push(key); }

    // console.log('version ' + key + ': ' + value);
    statsd.gauge('fe_version.'+key, value);
  });

  // we need to send zeros for versions with no users
  _.each(_.difference(versions, connectedVersions), function(ver) {
    // console.log('version ' + ver + ': 0');
    statsd.gauge('fe_version.'+ver, 0);
  });
}


function validate_sessionid(sessionid) {
  return new Promise(function (fulfill, reject) {
    var options = {
      method: 'GET',
      host: 'localhost',
      port: '8001',
      path: '/call_centre/proxy/user/me/',
      headers: {
        'Cookie': 'sessionid="' + sessionid + '"'
      }
    };
    var request = http.request(options);

    request.on('response', function (response) {
      if (redirected_to_login(response)) {
        reject(new Error('not authorized'));
      }

      response.on('data', function(body){
        fulfill(JSON.parse(body));
      });
    });


    request.on('error', function (e) {
      reject(new Error('Problem with request: ' + e.message));
    });


    request.end();
  });
}

function redirected_to_login(response) {
  return 'location' in response.headers;
}
nsp.use(function (socket, next) {
  if (socket.request.headers.cookie) {
    socket.request.cookie = cookie.parse(socket.request.headers.cookie);
    validate_sessionid(socket.request.cookie.sessionid).then(
      function(data) {
        socket.meData = data;
        next();
      },
      function(e) {
        next(new Error('not authorized: ' + e.message));
      })
    ;
  } else {
    next(new Error('not authorized'));
  }
});

nsp.on('connection', function (socket) {
  socket.on('identify', function(data) {
    peopleManager.identify(
      nsp, socket, data.username || data, data.usertype, data.appVersion, socket.meData
    );
    sendConnStats();
  });

  socket.on('disconnect', function () {
    peopleManager.disconnect(nsp, socket);
    sendConnStats();
  });

  socket.on('startViewingCase', function(caseref) {
    peopleManager.startViewingCase(nsp, socket, caseref);
  });

  socket.on('stopViewingCase', function(caseref) {
    peopleManager.stopViewingCase(nsp, socket, caseref);
  });

  socket.on('startViewingDOM', function() {
    peopleManager.startViewingDOM(nsp, socket);
  });

  socket.on('stopViewingDOM', function() {
    peopleManager.stopViewingDOM(nsp, socket);
  });

  socket.on('mirror', function(data){
    peopleManager.sendDOMChanges(nsp, socket, data);
  });
});

