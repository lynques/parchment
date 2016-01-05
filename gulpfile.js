var _ = require('lodash');
var gulp = require('gulp');
var gutil = require('gulp-util');
var karma = require('karma');
var istanbul = require('istanbul');
var path = require('path');
var source = require('vinyl-source-stream');
var webpack = require('webpack');
var webpackConfig = require('./webpack.conf');


gulp.task('default', ['build']);

gulp.task('build', function(callback) {
  webpack(webpackConfig, function(err, stats) {
    var json = stats.toJson();
    (json.warnings || []).forEach(function(warning) {
      gutil.log(gutil.colors.yellow("[webpack] " + warning));
    });
    (json.errors || []).forEach(function(error) {
      gutil.log(error);
    });
    if (err) throw new gutil.PluginError('webpack', err);
    callback();
  });
});

gulp.task('test', function(done) {
  new karma.Server({
    configFile: __dirname + '/karma.conf.js'
  }, done).start();
});

gulp.task('test:coverage', function(done) {
  var config = _.clone(webpackConfig);
  config.module.postLoaders = [
    { test: /src\/.*\.ts$/, loader: __dirname + '/gulpfile.js' }  // webpack insists on 'real' loader file
  ];
  new karma.Server({
    configFile: __dirname + '/karma.conf.js',
    reporters: ['progress', 'coverage'],
    webpack: config
  }, done).start();
});

gulp.task('test:server', function(done) {
  new karma.Server({
    configFile: __dirname + '/karma.conf.js',
    singleRun: false
  }, done).start();
});

gulp.task('test:travis', function(done) {
  new karma.Server({
    configFile: __dirname + '/karma.conf.js',
    browsers: ['saucelabs-chrome'],
    reporters: ['dots', 'saucelabs'],
    sauceLabs: {
      testName: 'Parchment Unit Tests',
      username: process.env.SAUCE_USER || 'quill',
      accessKey: process.env.SAUCE_KEY || 'adc0c0cf-221b-46f1-81b9-a4429b722c2e',
      build: process.env.TRAVIS_BUILD_ID,
      tunnelIdentifier: process.env.TRAVIS_JOB_NUMBER
    }
  }, done).start();
});

gulp.task('watch', function() {
  gulp.watch('**/*.ts', ['build']);
});


// Only for test:coverage
module.exports = function(source) {
  var instrumenter = new istanbul.Instrumenter({ embedSource: true, noAutoWrap: true });
  if (this.cacheable) this.cacheable();
  source = source.replace('for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];', '/* istanbul ignore next */\n    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];');
  source = source.replace('d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());', 'd.prototype = b === null ? /* istanbul ignore next */ Object.create(b) : (__.prototype = b.prototype, new __());');
  return instrumenter.instrumentSync(source, this.resourcePath);
};
