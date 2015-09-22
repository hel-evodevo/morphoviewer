var gulp = require('gulp');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');

var config = {
    // include all js files, but exclude any min.js files
    src: [ 'libs/**/*.js', 'src/graphics.js', 'src/file_io.js', 'src/mesh_tools.js', 'src/trackball.js', 'src/geometry.js', 'src/morphoviewer.js' ]
}

gulp.task( 'release', function() {
    return gulp.src( config.src )
        .pipe( uglify() )
        .pipe( concat('morphoviewer.min.js') )
        .pipe( gulp.dest( 'distribution' ) )
});

gulp.task( 'debug', function() {
    return gulp.src( config.src )
        .pipe( concat( 'morphoviewer.min.js' ) )
        .pipe( gulp.dest( 'distribution' ) )
});

gulp.task( 'default', ['debug'], function() {} );
