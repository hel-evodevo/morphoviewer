
var morphoviewer = ( function( module ) {

    /**
     * @param {Number} numPoints the number of points to include in the circle
     * @param {Number} radius
     * @param {String} plane the plane which the circle lies on: "xy", "xz", and "yz" are valid
     * */
    function circlePoints( numPoints, radius, plane) {
        var result = [];
        //push first point
        if ( plane === "xy" ) {
            result.push( radius * Math.cos(0.0), radius * Math.sin(0.0), 0.0 );
        } else if ( plane === "xz" ) {
            result.push( radius * Math.cos(0.0), 0.0, radius * Math.sin(0.0) );
        } else if ( plane === "yz" ) {
            result.push( 0.0, radius * Math.sin(0.0), radius * Math.cos(0.0) );
        }
        for ( var a = 2.0*Math.PI / numPoints, i = 0; a < 2.0*Math.PI; a += 2.0*Math.PI / numPoints, i++ ) {
            var pcos = radius * Math.cos(a);
            var psin = radius * Math.sin(a);
            if ( plane === "xy" ) {
                result.push( pcos, psin, 0.0 );
                result.push( pcos, psin, 0.0 );
            } else if ( plane === "xz" ) {
                result.push( pcos, 0.0, psin );
                result.push( pcos, 0.0, psin );
            } else if ( plane === "yz" ) {
                result.push( 0.0, psin, pcos );
                result.push( 0.0, psin, pcos );
            }
        }
        //connect the end to the beginning
        result.push( result[0], result[1], result[2] );
        return result;
    }

    var numPoints  = 100;

    module.Trackball = function( gl ) {
        this.gl = gl;
        this.numPoints = 0;
        this.vboxy = null;
        this.vboxz = null;
        this.vboyz = null;
        this.radius = 1.0;

        this.setRadius( 1.4 );
    };

    module.Trackball.prototype.setRadius = function( radius ) {
        this.radius = radius;
        var xy = circlePoints( numPoints, radius, "xy" );
        var xz = circlePoints( numPoints, radius, "xz" );
        var yz = circlePoints( numPoints, radius, "yz" );

        this.numPoints = xy.length / 3;

        this.vboxy = this.gl.createBuffer();
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, this.vboxy );
        this.gl.bufferData(
            this.gl.ARRAY_BUFFER,
            new Float32Array( xy ),
            this.gl.STATIC_DRAW
        );
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, null );
        this.vboxz = this.gl.createBuffer();
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, this.vboxz );
        this.gl.bufferData(
            this.gl.ARRAY_BUFFER,
            new Float32Array( xz ),
            this.gl.STATIC_DRAW
        );
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, null );

        this.vboyz = this.gl.createBuffer();
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, this.vboyz );
        this.gl.bufferData(
            this.gl.ARRAY_BUFFER,
            new Float32Array( yz ),
            this.gl.STATIC_DRAW
        );
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, null );
    };

    module.Trackball.prototype.drawXYCircle = function( shader ) {
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, this.vboxy );
        module.flatShader.setAttributes( this.gl, shader );
        this.gl.drawArrays( this.gl.LINES, 0, this.numPoints );
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, null );
    };

    module.Trackball.prototype.drawXZCircle = function( shader ) {
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, this.vboxz );
        module.flatShader.setAttributes( this.gl, shader );
        this.gl.drawArrays( this.gl.LINES, 0, this.numPoints );
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, null );
    };

    module.Trackball.prototype.drawYZCircle = function( shader ) {
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, this.vboyz );
        module.flatShader.setAttributes( this.gl, shader );
        this.gl.drawArrays( this.gl.LINES, 0, this.numPoints );
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, null );
    };

    module.Trackball.prototype.draw = function( shader ) {
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, this.vboxy );
        module.flatShader.setAttributes( this.gl, shader );
        this.gl.drawArrays( this.gl.LINES, 0, this.numPoints );
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, null );

        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, this.vboxz );
        module.flatShader.setAttributes( this.gl, shader );
        this.gl.drawArrays( this.gl.LINES, 0, this.numPoints );
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, null );

        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, this.vboyz );
        module.flatShader.setAttributes( this.gl, shader );
        this.gl.drawArrays( this.gl.LINES, 0, this.numPoints );
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, null );
    };

    module.Trackball.prototype.getRadius = function() {
        return this.radius;
    };

    return module;
} ( morphoviewer || {} ) );
