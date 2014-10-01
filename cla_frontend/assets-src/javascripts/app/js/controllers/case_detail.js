(function(){
  'use strict';

  angular.module('cla.controllers')
    .controller('CaseDetailCtrl',
      ['$rootScope', '$scope', 'case', 'eligibility_check', 'diagnosis', 'personal_details', '$modal', 'MatterType', 'History', 'log_set', 'hotkeys', '$state',
        function($rootScope, $scope, $case, $eligibility_check, $diagnosis, $personal_details, $modal, MatterType, History, log_set, hotkeys, $state){
          $scope.caseListStateParams = History.caseListStateParams;
          $scope.case = $case;
          $scope.log_set = log_set;
          $scope.eligibility_check = $eligibility_check;
          $scope.diagnosis = $diagnosis;
          $scope.personal_details = $personal_details;


          // checking the time after the template as been rendered
          $scope.$evalAsync(function() {
            $rootScope.$emit('timer:check');
          });

          $scope.edit_matter_types = function (next) {
            var child_scope = $scope.$new();
            child_scope.next = next;
            $modal.open({
              templateUrl: 'case_detail.matter_type.html',
              controller: 'SetMatterTypeCtrl',
              scope: child_scope,
              resolve: {
                'matter_types': function () {
                  return MatterType.get({
                    category__code: $scope.diagnosis.category
                  }).$promise;
                }
              }
            });
          };

          hotkeys
            .bindTo($scope)
            .add({
              combo: 'g c',
              description: 'Case home',
              callback: function() {
                $state.go('case_detail.edit');
              }
            })
            .add({
              combo: 'g d',
              description: 'Scope diagnosis',
              callback: function() {
                $state.go('case_detail.edit.diagnosis');
              }
            })
            .add({
              combo: 'g f',
              description: 'Financial assessment',
              callback: function() {
                $state.go('case_detail.edit.eligibility');
              }
            })
            .add({
              combo: 'g a',
              description: 'Assign provider',
              callback: function() {
                $state.go('case_detail.assign');
              }
            })
            .add({
              combo: 'g h',
              description: 'Alternative help',
              callback: function() {
                $state.go('case_detail.alternative_help');
              }
            })
            .add({
              combo: 'g s',
              description: 'Alternative help',
              callback: function() {
                $state.go('case_detail.suspend');
              }
            });

          // modelsEventManager.onEnter();
          // $scope.$on('$destroy', function () {
          //   modelsEventManager.onExit();
          // });
        }
      ]
    );

  angular.module('cla.controllers')
    .controller('LogListCtrl',
    ['$scope', '$modal',
      function ($scope, $modal) {
        $scope.logSet = [];

        $scope.$watch('log_set.data', function(newVal) {
          // log set grouping
          var currentTimer = null;
          $scope.logSet = [];
          angular.forEach(newVal, function(log) {
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
        });

        $scope.showDiagnosisSummary = function(log) {
          $modal.open({
            templateUrl: 'includes/diagnosis.summary.modal.html',
            controller: ['$scope', '$modalInstance', 'log', 'Diagnosis',
              function($scope, $modalInstance, log, Diagnosis) {
                $scope.diagnosis = new Diagnosis(log.patch);
                $scope.diagnosisTitle = function () {
                  return $scope.diagnosis.isInScopeTrue() ? 'In scope' : 'Not in scope';
                };
                $scope.diagnosisTitleClass = function () {
                  return $scope.diagnosis.isInScopeTrue() ? 'Icon Icon--lrg Icon--solidTick Icon--green' : 'Icon Icon--lrg Icon--solidCross Icon--red';
                };
                $scope.close = function () {
                  $modalInstance.dismiss('cancel');
                };
              }
            ],
            resolve: {
              'log': function () {
                return log;
              }
            }
          });
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
      }
    ]
  );


  angular.module('cla.controllers')
    .controller('SetECFundCtrl',
    ['$scope', '$modalInstance', 'ECF_STATEMENT',
      function ($scope, $modalInstance, ECF_STATEMENT) {
        $scope.ecf_statements = ECF_STATEMENT;

        $scope.cancel = function () {
          $modalInstance.dismiss('cancel');
        };

        $scope.save = function() {
          $scope.case.$patch().then(function () {
            $modalInstance.close();
          });

        };
      }
    ]
  );
})();
