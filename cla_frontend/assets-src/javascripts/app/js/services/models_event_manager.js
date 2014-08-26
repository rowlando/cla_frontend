'use strict';
(function(){

  angular.module('cla.services')
    .factory('ModelsEventManager', ['postal', 'Log', function(postal, Log) {
      return function(case_, eligibility_check, diagnosis, log_set) {
        var subscriptions = [],
            configured = false;

        return {
          onEnter: function() {
            if (configured) {
              throw 'ModelsEventManager already configured!';
            }
            configured = true;

            subscriptions.push(
              postal.subscribe({
                channel  : 'models',
                topic    : 'Diagnosis.saved',
                callback : function(_diagnosis) {
                  // NOTE: always check for object identity (_diagnosis === diagnosis)
                  // otherwise, you might end up updating other case's objects if the destroy
                  // callback doesn't get triggered for any reason
                  if (_diagnosis === diagnosis && _diagnosis.isInScopeTrue() && _diagnosis.category) {
                    eligibility_check.category = _diagnosis.category;
                    if (eligibility_check.reference) {
                      eligibility_check.$update(case_.reference);
                    }
                  }
                }
              })
            );

            this.refreshLogs();
          },

          onExit: function() {
            angular.forEach(subscriptions, function(subscription) {
              subscription.unsubscribe();
            });
          },

          refreshLogs: function() {
            Log.query({case_reference: case_.reference}).$promise.then(function(data) {
              log_set.data = data;
            });
          }
        };
      };
    }]);

})();