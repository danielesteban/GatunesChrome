var closurecompiler = require('closurecompiler'),
	exec = require('child_process').exec,
	fs = require('fs-extra'),
	less = require('less'),
	path = require('path'),
	repo = path.join(__dirname, '..'),
	bundle = path.join(repo, 'bundle'),
	content = [
		'fonts/',
		'img/',
		'js/lib.js',
		'api.html',
		'index.html',
		'manifest.json'
	],
	css = 'screen.less',
	templates = [
		'partials/',
		'views/'
	],
	js = [
		[
			'app.js',
			'controllers.js',
			'directives.js',
			'filters.js',
			'services.js',
			'templates.js'
		],
		[
			'api.js'
		]
	];

function createBundle() {
	console.log('Creating bundle...');
	fs.remove(bundle, function() {
		fs.mkdir(bundle, function() {
			fs.mkdir(path.join(bundle, 'css'), function() {
				var count = content.length;
				if(!count) return compileLess();
				content.forEach(function(location) {
					fs.copy(path.join(repo, location), path.join(bundle, location), function() {
						--count === 0 && compileLess();
					});
				});
			});
		});
	});
};

function compileLess() {
	if(!css) return compressTemplates();
	console.log('Compiling less...');
	fs.readFile(path.join(repo, 'css', css), {encoding: 'utf-8'}, function(err, data) {
		less.render(data, {
			paths: [path.dirname(path.join(repo, 'css', css))],
			filemame: 'screen.css',
			compress: true
		}, function(err, output) {
			fs.writeFile(path.join(bundle, 'css', 'screen.css'), output.css, function() {
				compressTemplates();
			});
		});
	});
}

function compressTemplates() {
	var dircount = templates.length;
	if(!dircount) return compileJS();
	console.log('Compressing templates...');
	var js = "angular.module('Gatunes.templates',[]).run(function($templateCache){";
	templates.forEach(function(location) {
		fs.readdir(path.join(repo, location), function(err, list) {
			var files = [];
			list.forEach(function(file) {
				file.substr(file.length - 5) === '.html' && files.push(file);
			});
			var count = files.length;
			if(!count) return dircount--;
			files.forEach(function(file) {
				fs.readFile(path.join(path.join(repo, location), file), {encoding: 'utf-8'}, function(err, data) {
					js += "$templateCache.put('" + location + file + "'," + JSON.stringify(data.replace(/\n/g, '').replace(/\r/g, '').replace(/\t/g, '')) + ");";
					if(--count !== 0 || --dircount !== 0) return;
					fs.writeFile(path.join(bundle, 'js', 'templates.js'), js + '});', function() {
						compileJS();
					});
				});
			});
		});
	});
	dircount === 0 && compileJS();
};

function compileJS() {
	console.log('Compiling js...');
	var count = js.length;
	if(count === 0) return updateIndex();
	js.forEach(function(files, index) {
		var filecount = files.length;
		if(filecount === 0) return --count === 0 && updateIndex();
		var js = '';
		files.forEach(function(file, i) {
			fs.readFile(path.join(file === 'templates.js' ? bundle : repo, 'js', file), {encoding: 'utf-8'}, function(err, data) {
				js += data.replace(new RegExp('\\/\\*,\'Gatunes.templates\'\\*\\/', 'g'), ',\'Gatunes.templates\'').replace(/'use strict';/g, '');
				if(--filecount > 0) return;
				fs.writeFile(path.join(bundle, 'js', files[0] + '.compacted'), js, function() {
					exec(__dirname + '/node_modules/.bin/ng-annotate -ra ' + path.join(bundle, 'js', files[0] + '.compacted') + ' -o ' + path.join(bundle, 'js', files[0] + '.annotated'), function() {
						fs.unlink(path.join(bundle, 'js', files[0] + '.compacted'), function() {
							closurecompiler.compile([path.join(bundle, 'js', files[0] + '.annotated')], {
								compilation_level: 'SIMPLE_OPTIMIZATIONS'
							}, function(err, js) {
								fs.writeFile(path.join(bundle, 'js', files[0]), js, function() {
									fs.unlink(path.join(bundle, 'js', files[0] + '.annotated'), function() {
										--count === 0 && updateIndex();
										if(index === 0) fs.unlink(path.join(bundle, 'js', 'templates.js'));
									});
								});
							});
						});
					});
				});
			});
		});
		
	});
}

function updateIndex() {
	console.log('Updating index...');
	fs.readFile(path.join(bundle, 'index.html'), {encoding: 'utf-8'}, function(err, data) {
		var index = data.substr(0, data.indexOf('<script src="js/app.js"></script>')).replace(new RegExp(css.replace('/', '\\/')), 'screen.css').replace(/stylesheet\/less/, 'stylesheet').replace(/<script src="js\/less\.js"><\/script>/, '') + 
			'<script src="js/app.js"></script>' + 
			data.substr(data.indexOf('<title>'));
	
		fs.writeFile(path.join(bundle, 'index.html'), index.replace(/\n/g, '').replace(/\r/g, '').replace(/\t/g, ''), function() {
			done();
		});					
	});
}

function done() {
	console.log('Zipping bundle...');
	exec('cd ' + bundle + ' && zip -r ../bundle.zip .', function() {
		fs.remove(bundle, function() {
			console.log('Done!');
		});
	});
}

createBundle();
