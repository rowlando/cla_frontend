/* jshint unused: false */
(function(){
  'use strict';

  angular.module('cla.services')
    .factory('cla.bus', ['postal', '$rootScope', '_', 'appUtils', 'flash', function (postal, $rootScope, _, appUtils, flash) {

      function init(user) {
        // io is global reference to socket.io
        var host = $('head').data('socketioServer');
        host = host.replace(/^https?:/, window.location.protocol);
        var socket = io.connect(host);
        var SYSTEM_MSG_OPTIONS = {  // hardcoded for now for security reasons
          '1': 'Please refresh your browser. <a href="" target="_self">Reload now</a>'
        };

        // USER IDENTIFICATION

        socket.on('connect', function() {
          socket.emit('identify', {
            'username': user.username,
            'usertype': appUtils.appName,
            'appVersion': appUtils.getVersion()
          });
        });

        socket.on('systemMessage', function(msgID) {
          var msg = SYSTEM_MSG_OPTIONS[msgID];
          if (typeof msg !== undefined) {
            flash('error', msg);
          }
        });

        // VIEWING CASE

        postal.subscribe({
          channel: 'system',
          topic: 'case.startViewing',
          callback: function(data) {
            socket.emit('startViewingCase', data.reference);
          }
        });

        postal.subscribe({
          channel: 'system',
          topic: 'case.stopViewing',
          callback: function(data) {
            socket.emit('stopViewingCase', data.reference);
          }
        });

        // VIEWING DOM
        postal.subscribe({
          channel: 'mirror',
          topic: 'startViewingDOM',
          callback: function() {
            socket.emit('startViewingDOM');
          }
        });

        postal.subscribe({
          channel: 'mirror',
          topic: 'stopViewingDOM',
          callback: function() {
            socket.emit('stopViewingDOM');
          }
        });

        socket.on('peopleViewing', function(data) {
          $rootScope.peopleViewingCase = _.without(data, $rootScope.user.username);
          $rootScope.$apply();
        });

        socket.on('mirrorRequest', function () {
          socket.emit('mirror', { clear: true, base: location.href.match(/^(.*\/)[^\/]*$/)[1] });

          var mirror =  new TreeMirrorClient(document, {
            initialize: function(rootId, children) {
              socket.emit('mirror', JSON.stringify({
                f: 'initialize',
                args: [rootId, children]
              }));
            },
            applyChanged: function(removed, addedOrMoved, attributes, text) {
              socket.emit('mirror', JSON.stringify({
                f: 'applyChanged',
                args: [removed, addedOrMoved, attributes, text]
              }));
            }
          });
          socket.onclose = function(){
            mirror.disconnect();
          };
        });

        socket.on('mirror', function(data) {
          postal.publish({
            channel: 'mirror',
            topic: 'mirror',
            data: data
          });
        });
      }

      return {
        install: function() {

          postal.subscribe({
            channel: 'system',
            topic: 'user.identified',
            callback: function(user) {
              init(user);
            }
          });

        }
      };
    }]);
})();
