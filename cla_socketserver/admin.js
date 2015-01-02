(function () {
  'use strict';

  var _ = require('underscore')._;
  var peopleManager = require('./utils/peopleManager');
  var utils = require('./utils/utils');
  var MSG_OPTIONS = {
    '1': 'Please refresh your browser as your version of the software is out of date'
  };


  function getViews(nsp) {
    function validateMsg(msg) {
      if (!_.has(MSG_OPTIONS, msg)) {
        var err = new Error('You didn\'t pass any msg options.');
        err.status = 403;
        throw err;
      }
    }

    return {
      peopleMap: function (req, res) {
        res.send(peopleManager.people);
      },

      admin: function (req, res) {
        res.redirect('/admin/broadcast/');
      },

      broadcast: function (req, res) {
        res.render('broadcast', {
          activeTab: 'broadcast',
          people: peopleManager.people,
          msgOptions: MSG_OPTIONS
        });
      },

      mirror: function (req, res) {
        res.render('mirror', {
          activeTab: 'mirror',
          people: peopleManager.people,
          msgOptions: MSG_OPTIONS
        });
      },

      sendBroadcast: function (req, res, next) {
        validateMsg(req.body.msg);

        utils.sendToAllConnectedClients(nsp, 'systemMessage', req.body.msg);
        res.send('Done');
      },

      sendToClients: function (req, res) {
        validateMsg(req.body.msg);


        var socketIDs = req.body.socketID;

        if (!_.isArray(socketIDs)) {
          socketIDs = [socketIDs];
        }

        _.each(socketIDs, function (socketID) {
          utils.sendToClient(nsp, socketID, 'systemMessage', req.body.msg);
        });
        res.send('Done');
      },

      sendMirrorRequest: function(req, res) {
        if (req.body.stopRequest === 'true') {
          utils.sendToAllConnectedClients(nsp, 'stopMirroring', '');
          res.send('Mirroring stopped');
        } else if (req.body.startRequest === 'true') {
          var socketID = req.body.socketID;
          utils.sendToClient(nsp, socketID, 'mirrorRequest', '');
          res.send('Request sent');
        }
        res.send('Could not complete request');
      }
    };
  }

  module.exports = {
    install: function (app, nsp) {
      var views = getViews(nsp);

      app.get('/admin/', views.admin);
      app.get('/admin/broadcast/', views.broadcast);
      app.get('/admin/mirror/', views.mirror);
      app.post('/admin/send-broadcast/', views.sendBroadcast);
      app.post('/admin/send-to-clients/', views.sendToClients);
      app.post('/admin/mirror-request/', views.sendMirrorRequest);
      app.get('/admin/peopleMap/', views.peopleMap);
    }
  }
})();
