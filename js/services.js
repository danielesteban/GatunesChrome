'use strict';

/* Services */
angular.module('Gatunes.services', [])
.value('events', {})
.factory('api', function($q, $window, events) {
	var api = null,
		subscription = null,
		onConnect = [],
		connecting = false,
		connect = function(callback) {
			if(api) return callback && callback();
			callback && onConnect.push(callback);
			if(connecting) return;
			connecting = true;
			chrome.runtime.getBackgroundPage(function(background) {
				api = background.API;
				onConnect.forEach(function(cb) {
					cb();
				});
				onConnect.length = 0;
				connecting = false;
			});
		};

	$window.addEventListener('unload', function() {
		subscription && api.Unsubscribe({id: subscription});
	});

	connect(function() {
		api.Subscribe({
			handler: function(event, data) {
				events[event] && events[event](data);
			}
		}, function(id) {
			subscription = id;
		});
	});

	return function(method, params, callback) {
		connect(function() {
			if(!api || !api[method]) return callback();
			var defer = $q.defer();
			defer.promise.then(callback);
			api[method](params, defer.resolve);
		});
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
