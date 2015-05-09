'use strict';

/* App & Routes */
angular.module('Gatunes', [
	'ngAnimate',
	'ngRoute',
	'Gatunes.controllers',
	'Gatunes.directives',
	'Gatunes.filters',
	'Gatunes.services'
	/*,'Gatunes.templates'*/
])
.config(function($compileProvider, $routeProvider) {
	$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|chrome-extension):/);
	$routeProvider.when('/', {controller: 'tags', templateUrl: 'views/tags.html'});
	$routeProvider.when('/artist/:artist', {controller: 'playlist', templateUrl: 'views/playlist.html'});
	$routeProvider.when('/tag/:tag', {controller: 'playlist', templateUrl: 'views/playlist.html'});
	$routeProvider.when('/track/:track', {controller: 'playlist', templateUrl: 'views/playlist.html'});
	$routeProvider.otherwise({redirectTo: '/'});
})
.run(function($rootScope, $location, history) {
	var url = history.pop();
	url && $location.path(url);
	$rootScope.$on("$routeChangeSuccess", function(event, current) {
		if(!current.$$route) return;
		current.$$route.controller === 'tags' && history.clear();
		history.push($location.path());
	});
})
.run(function($window) {
	$window.document.body.addEventListener('contextmenu', function(e) {
	    e.preventDefault();
	});
});
