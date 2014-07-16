(function(){
  'use strict';

  angular.module('cla.controllers')
    .controller('CaseDetailCtrl',
      ['$rootScope', '$scope', 'case', 'eligibility_check', 'personal_details', '$modal', '$state', 'MatterType',
        function($rootScope, $scope, $case, $eligibility_check, $personal_details, $modal, $state, MatterType){
          $scope.case = $case;
          $scope.eligibility_check = $eligibility_check;
          $scope.personal_details = $personal_details;

          // log set grouping
          $scope.logSet = [];
          var currentTimer = null;
          angular.forEach($scope.case.log_set, function(log) {
            if (!log.timer) {
              $scope.logSet.push([log]);
            } else {
              if (log.timer !== currentTimer) {
                currentTimer = log.timer;
                $scope.logSet.push([log]);
              } else {
                var ll = $scope.logSet[$scope.logSet.length-1];
                ll.push(log);
                $scope.logSet[$scope.logSet.length-1] = ll;
              }
            }
          });

          // checking the time after the template as been rendered
          $scope.$evalAsync(function() {
            $rootScope.$emit('timer:check');
          });

          $scope.suspend = function() {
            $modal.open({
              templateUrl: 'case_detail.suspend.html',
              controller: 'SuspendCaseCtl',
              resolve: {
                'case': function() {
                  return $scope.case;
                }
              }
            });
          };


          $scope.edit_matter_types = function (next) {
            var child_scope = $scope.$new();
            child_scope.next = next;
            $modal.open({
              templateUrl: 'case_detail.matter_type.html',
              controller: 'SetMatterTypeCtrl',
              scope: child_scope,
              resolve: {
                'matter_types': function () {
                  return MatterType.get({category__code: $scope.eligibility_check.category}).$promise;
                }
              }
            });
          };

          $scope.assign_to_provider = function () {
            var transition_to = 'case_detail.assign';
            if (!($scope.case.matter_type1 && $scope.case.matter_type2)) {
              $scope.edit_matter_types(transition_to);
            } else {
              $state.go(transition_to);
            }
          };
        }
      ]
    );

  angular.module('cla.controllers')
    .controller('SetMatterTypeCtrl',
    ['$scope', '$modalInstance', 'matter_types', '$state',
      function ($scope, $modalInstance, matter_types, $state) {
        $scope.matter_types = matter_types;

        $scope.cancel = function () {
          $modalInstance.dismiss('cancel');
          $scope.case.matter_type1 = null;
          $scope.case.matter_type2 = null;
        };

        $scope.save = function() {
          $scope.case.$set_matter_types().then(function () {
            $modalInstance.close();
            if ($scope.next) {
              $state.go($scope.next);
            }
          });

        };
  }]);

  angular.module('cla.controllers')
    .controller('SuspendCaseCtl',
      ['$scope', '$modalInstance', 'case', 'Event', '$state', 'flash',
        function($scope, $modalInstance, _case, Event, $state, flash) {
          new Event().list_by_event_key('suspend_case', function(data) {
            $scope.codes = data;
          });

          $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
          };

          $scope.suspend = function() {
            _case.$suspend({
              'event_code': this.event_code,
              'notes': this.notes || ''
            }, function() {
              $state.go('case_list');
              flash('success', 'Case '+_case.reference+' suspended successfully');
              $modalInstance.dismiss('cancel');
            });

          };
        }
      ]
    );

})();