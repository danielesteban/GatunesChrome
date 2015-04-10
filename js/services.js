'use strict';

/* Services */
angular.module('Gatunes.services', [])
.factory('api', function($q, $window) {
	var api = $window.chrome.extension.getBackgroundPage().API;
	return function(method, params, callback) {
		if(!api || !api[method]) return callback();
		var defer = $q.defer();
		defer.promise.then(callback);
		api[method](params, defer.resolve);
	};
})
.factory('history', function($window) {
	var history = $window.localStorage.hasOwnProperty("history") ? JSON.parse($window.localStorage.history) : [];
	return {
		save: function() {
			$window.localStorage.history = JSON.stringify(history);
		},
		pop: function() {
			var path = history.pop();
			this.save();
			return path;
		},
		push: function(path) {
			history.push(path);
			this.save();
		},
		clear: function() {
			history.length = 0;
			this.save();
		}
	}
});
