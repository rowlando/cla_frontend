(function () {
  'use strict';

  var _ = require('underscore')._;
  var peopleManager = require('./utils/peopleManager');
  var utils = require('./utils/utils');
  var MSG_OPTIONS = {
    '1': 'Out of date version, refresh browser'
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
        var data = {
          activeTab: 'broadcast',
          people: peopleManager.people,
          peopleCount: peopleManager.getPeopleCount(),
          msgOptions: MSG_OPTIONS
        };

        if (req.body.selectedClients === 'true') {
          validateMsg(req.body.msg);

          var socketIDs = req.body.socketID;

          if (!_.isArray(socketIDs)) {
            socketIDs = [socketIDs];
          }

          _.each(socketIDs, function(socketID) {
            utils.sendToClient(nsp, socketID, 'systemMessage', req.body.msg);
          });

          data.success = true;
        } else if (req.body.allClients === 'true') {
          validateMsg(req.body.msg);
          utils.sendToAllConnectedClients(nsp, 'systemMessage', req.body.msg);

          data.success = true;
        }

        res.render('broadcast', data);
      },

      mirror: function (req, res) {
        var data = {
          activeTab: 'mirror',
          people: peopleManager.people,
          peopleCount: peopleManager.getPeopleCount(),
          msgOptions: MSG_OPTIONS
        };

        if (req.body.stopRequest === 'true') {
          utils.sendToAllConnectedClients(nsp, 'stopMirroring', '');

          data.success = true;
          data.message = 'Mirroring successfully stopped';
        } else if (req.body.startRequest === 'true') {
          var socketID = req.body.socketID;
          utils.sendToClient(nsp, socketID, 'mirrorRequest', '');

          data.success = true;
          data.message = 'Mirroring successfully started';
        }

        res.render('mirror', data);
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
    }
  }

  module.exports = {
    install: function(app, nsp) {
      var views = getViews(nsp);

      app.get('/admin/', views.admin);
      app.all('/admin/broadcast/', views.broadcast);
      app.all('/admin/mirror/', views.mirror);
      app.get('/admin/peopleMap/', views.peopleMap);
    }
  }
})();
