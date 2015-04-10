'use strict';

/* Filters */
angular.module('Gatunes.filters', [])
.filter('addZero', function() {
	return function(n) {
		(n = '' + n).length < 2 && (n = '0' + n);
		return n;
	}
})
.filter('time', function(addZeroFilter) {
	return function(duration) {
		var mins = Math.floor(duration / 60),
			seconds = duration % 60;

		return addZeroFilter(mins) + ':' + addZeroFilter(seconds);
	}
})
.filter('tag', function() {
	return function(tag) {
		return tag === 'Country_Spain' ? 'Top en España' : tag;
	}
});
