/*
 Copyright (c) 2014 Johann Muszynski

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:
 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.*/

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

        this.setRadius( 1.4 );
    };

    module.Trackball.prototype.setRadius = function( radius ) {
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
        module.lineShader.setAttributes( this.gl, shader );
        this.gl.drawArrays( this.gl.LINES, 0, this.numPoints );
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, null );
    };

    module.Trackball.prototype.drawXZCircle = function( shader ) {
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, this.vboxz );
        module.lineShader.setAttributes( this.gl, shader );
        this.gl.drawArrays( this.gl.LINES, 0, this.numPoints );
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, null );
    };

    module.Trackball.prototype.drawYZCircle = function( shader ) {
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, this.vboyz );
        module.lineShader.setAttributes( this.gl, shader );
        this.gl.drawArrays( this.gl.LINES, 0, this.numPoints );
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, null );
    };

    module.Trackball.prototype.draw = function( shader ) {
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, this.vboxy );
        module.lineShader.setAttributes( this.gl, shader );
        this.gl.drawArrays( this.gl.LINES, 0, this.numPoints );
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, null );

        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, this.vboxz );
        module.lineShader.setAttributes( this.gl, shader );
        this.gl.drawArrays( this.gl.LINES, 0, this.numPoints );
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, null );

        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, this.vboyz );
        module.lineShader.setAttributes( this.gl, shader );
        this.gl.drawArrays( this.gl.LINES, 0, this.numPoints );
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, null );
    };

    return module;
} ( morphoviewer || {} ) );
