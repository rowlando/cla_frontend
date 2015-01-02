(function () {
  'use strict';

  var mod = angular.module('cla.states');

  mod.config(['AppSettings', function (AppSettings) {
    var states = mod.states || {};

    states.MirrorState = {
      parent: 'layout',
      name: 'mirror',
      controller: 'MirrorCtrl',
      url: AppSettings.BASE_URL + 'mirror/',
      templateUrl: 'mirror.html',
      resolve: {
        CanAccess: ['user', '$q', function(user, $q) {
          var deferred = $q.defer();

          if (!!user.is_cla_superuser) {
            deferred.resolve(true);
          } else {
            deferred.reject({
              modal: true,
              title: 'You can\'t access this page',
              msg: 'Permissions required',
              goto: 'case_list'
            });
          }
          return deferred.promise;
        }]
      },
      onEnter: ['postal', '$window', 'TreeMirror', function(postal, $window, TreeMirror) {
        var document = $window.document;
        var base;
        var mirror = new TreeMirror(document, {
          createElement: function (tagName) {
            var node;

            if (tagName === 'SCRIPT') {
              node = document.createElement('NO-SCRIPT');
              node.style.display = 'none';
              return node;
            }

            if (tagName === 'HEAD') {
              node = document.createElement('HEAD');
              node.appendChild(document.createElement('BASE'));
              node.firstChild.href = base;
              return node;
            }
          }
        });

        function clearPage () {
          while (document.firstChild) {
            document.removeChild(document.firstChild);
          }
        }

        function handleMessage (msg) {
          if (msg.base) {
            base = msg.base;
          }

          if (msg.clear) {
            clearPage();
          } else {
            mirror[msg.f].apply(mirror, msg.args);
          }
        }

        postal.publish({
          channel: 'mirror',
          topic: 'startViewingDOM',
          data: {}
        });

        this.mirrorSubscriber = postal.subscribe({
          channel: 'mirror',
          topic: 'mirror',
          callback: function (data){
            if (typeof data !== 'object') {
              data = JSON.parse(data);
            }

            if (data instanceof Array) {
              data.forEach(function(subMessage) {
                handleMessage(JSON.parse(subMessage));
              });
            } else {
              handleMessage(data);
            }
          }
        });
      }],
      onExit: ['postal', function (postal) {
        if (this.mirrorSubscriber !== undefined) {
          this.mirrorSubscriber.unsubscribe();
        }

        postal.publish({
          channel: 'mirror',
          topic: 'stopViewingDOM',
          data: {}
        });
      }]
    };

    mod.states = states;
  }]);
})();
