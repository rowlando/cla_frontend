(function () {
  'use strict';

  var mod = angular.module('cla.states.provider');

  mod.config(function () {
    var states = mod.states || angular.module('cla.states').states;

    states.CaseList.templateUrl = 'provider/case_list.html';

    mod.states = states;
  });
})();
