
(function () {
	'use strict';

	angular.module('cla.services')
	.factory('Session', ['$rootScope', '$window', function($rootScope, $window) {
		var LOCAL_STORAGE_KEY = 'cla:tabs-open',
				getTabs = function() {
					var tabs = localStorage.getItem(LOCAL_STORAGE_KEY) || 0;
					tabs = parseInt(tabs);
					if (isNaN(tabs)) {
						tabs = 0;
					}
					return tabs;
				};

		localStorage.setItem(LOCAL_STORAGE_KEY, getTabs()+1);

		$window.onbeforeunload = function() {
			localStorage.setItem(LOCAL_STORAGE_KEY, Math.max(getTabs()-1, 0));
		};

		$rootScope.multipleTabsOpen = getTabs();
		$window.addEventListener('storage', function(event) {
			if (event.key === LOCAL_STORAGE_KEY) {
				$rootScope.$apply(function() {
					$rootScope.multipleTabsOpen = getTabs();
				});
			}
		});

		return {};
	}]);
})();
