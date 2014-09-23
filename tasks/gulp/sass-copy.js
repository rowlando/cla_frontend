(function(){
  'use strict';
  
  var gulp = require('gulp');
  var paths = require('./_paths');

  // copy & compile scss
  gulp.task('sass-copy', function() {
    return gulp
      .src(paths.styles)
      .pipe(gulp.dest(paths.tmp + 'stylesheets/'));
  });
})();
