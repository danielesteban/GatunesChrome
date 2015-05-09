'use strict';

/* Controllers */
angular.module('Gatunes.controllers', [])
.controller('tags', function($scope, $location, api, events) {
	$scope.loading = true;
	api('GetTopTags', null, function(tags) {
		$scope.tags = tags;
		delete $scope.loading;

		events.tag = function(data) {
			for(var i=0; i<tags.length; i++) {
				if(tags[i].name === data.name) {
					tags[i].image = data.image;
					$scope.$apply();
					break;
				}
			}
		};

		$scope.$on('$destroy', function() {
			delete events.tag;
		});
	});

	$scope.autofill = {
		results: [],
		update: function() {
			delete this.selected;
			if(!this.query) return this.results.length = 0;
			var self = this;
			api('GetArtists', {query: self.query}, function(artists) {
				artists.forEach(function(artist) {
					var link = {
							name: artist.name
						};

					artist.mbid && (link.mbid = artist.mbid);
					artist.link = encodeURIComponent(JSON.stringify(link));
				});
				self.results = artists;
				self.selected = 0;
			});
		},
		keydown: function(e) {
			switch(e.keyCode) {
				case 13: //Enter
					$location.path('artist/' + this.results[this.selected].link);
				break;
				case 38: //Up
					--this.selected < 0 && (this.selected = 0);
				break;
				case 40: //Down
					++this.selected >= this.results.length && (this.selected = this.results.length - 1);
				break;
				default:
					return;
			}
			e.preventDefault();
		}
	}
})
.controller('playlist', function($scope, $routeParams, $location, $window, tagFilter, api, events, history) {
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
	$scope.related = function(e, track) {
		e.stopPropagation();
		var url = {name: track.name};
		if(track.mbid) url.mbid = track.mbid
		else url.artist = track.artist.name;
		$location.path('/track/' + encodeURIComponent(JSON.stringify(url)));
	};
	$routeParams.artist && ($routeParams.artist = JSON.parse(decodeURIComponent($routeParams.artist)));
	$routeParams.track && ($routeParams.track = JSON.parse(decodeURIComponent($routeParams.track)));
	api('GetPlaylist', $routeParams, function(playlist) {
		$scope.playlist = playlist;
		if(playlist.artist) playlist.title = playlist.artist.name;
		else if(playlist.tag) playlist.title = tagFilter(playlist.tag);
		else if(playlist.track) playlist.title = playlist.track.name;

		events.track = function(data) {
			var isPlaylist;
			if(playlist.artist) {
				if(playlist.artist.mbid) {
					data.playlist.artist && data.playlist.artist.mbid && data.playlist.artist.mbid === playlist.artist.mbid && (isPlaylist = true);
				} else {
					data.playlist.artist && !data.playlist.artist.mbid && data.playlist.artist.name === playlist.artist.name && (isPlaylist = true);
				}
			} else if(playlist.tag) {
				data.playlist.tag && data.playlist.tag === playlist.tag && (isPlaylist = true);
			} else if(playlist.track) {
				if(playlist.track.mbid) {
					data.playlist.track && data.playlist.track.mbid && data.playlist.track.mbid === playlist.track.mbid && (isPlaylist = true);
				} else {
					data.playlist.track && !data.playlist.track.mbid && data.playlist.track.artist.name === playlist.track.artist && data.playlist.track.name === playlist.track.name && (isPlaylist = true);
				}
			}
			if(!isPlaylist) return;
			playlist.tracks.push(data.track);
			$scope.$apply();
		};

		$scope.$on('$destroy', function() {
			delete events.track;
		});
	});
})
.controller('player', function($rootScope, $scope, $location, $window, api, events) {
	events.playing = function(playing) {
		if(!playing) delete $rootScope.playing;
		else $rootScope.playing = playing;
		$rootScope.$apply();
	};

	$scope.$on('$destroy', function() {
		delete events.playing;
	});

	$scope.player = function() {
		api('ShowPlayer');
	};

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
