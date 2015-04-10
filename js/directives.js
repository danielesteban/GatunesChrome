'use strict';

/* Directives */
angular.module('Gatunes.directives', [])
.directive('spinner', function() {
	return {
		restrict: 'E',
		link: function(scope, element, attrs) {
			var spinner = new Spinner({color: '#ffffff'}).spin(element[0]);
			scope.$on('$destroy', function() {
				spinner.stop();
			});
		}
	};
});
