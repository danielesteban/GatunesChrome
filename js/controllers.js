'use strict';

/* Controllers */
angular.module('Gatunes.controllers', [])
.controller('tags', function($scope, api) {
	$scope.loading = true;
	api('GetTopTags', null, function(tags) {
		var top = tags.shift();
		tags.sort(function(a, b) {
			return b.name > a.name ? -1 : (b.name < a.name ? 1 : 0);
		});
		tags.unshift(top);
		$scope.tags = tags;
		delete $scope.loading;
	});
})
.controller('playlist', function($scope, $routeParams, $location, $window, tagFilter, api, history) {
	$scope.back = function() {
		history.pop();
		$location.path(history.pop());
	};
	$scope.menu = function() {
		$location.path('/');
	};
	$scope.play = function(index) {
		api('PlayVideo', {
			playlist: $routeParams,
			index: index
		});
	};
	$routeParams.track && ($routeParams.track = JSON.parse(decodeURIComponent($routeParams.track)));
	api('GetPlaylist', $routeParams, function(playlist) {
		$scope.playlist = playlist;
		if(playlist.tag) playlist.title = tagFilter(playlist.tag);
		else if(playlist.track) {
			playlist.title = playlist.track.name;
		}
		playlist.onUpdate(function(track) {
			$scope.playlist.tracks.push(track);
			$scope.$apply();
		});

		var destroy = function() {
			delete playlist.update;
		};
		$window.addEventListener('unload', destroy);
		$scope.$on('$destroy', function() {
			destroy();
			$window.removeEventListener('unload', destroy);
		});
	});
})
.controller('player', function($rootScope, $scope, $location, $window, api) {
	var binding = {
			update: function(playing) {
				if(!playing) delete $rootScope.playing;
				else $rootScope.playing = playing;
				$rootScope.$apply();
			}
		},
		destroy = function() {
			delete binding.update;
		};

	$window.addEventListener('unload', destroy);

	api('SubscribePlayer', binding);
	$scope.$on('$destroy', function() {
		destroy();
		$window.removeEventListener('unload', destroy);
	});

	$scope.current = function() {
		api('GetCurrentPlaylistPath', null, function(path) {
			path && $location.path(path);
		});
	};

	$scope.prev = function() {
		api('PrevVideo');
	};

	$scope.next = function() {
		api('NextVideo');
	};

	$scope.related = function() {
		var track = {name: $rootScope.playing.name};
		if($rootScope.playing.mbid) track.mbid = $rootScope.playing.mbid
		else track.artist = $rootScope.playing.artist.name;
		$location.path('/track/' + encodeURIComponent(JSON.stringify(track)));
	};

	$scope.share = function() {
		if(!$rootScope.playing) return;
		window.open('https://www.facebook.com/sharer.php?u=' + encodeURIComponent('https://www.youtube.com/watch?v=' + $rootScope.playing.video.id), 'sharing', 'width=600,height=300');
	};
});
