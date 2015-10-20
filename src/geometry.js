
var morphoviewer = ( function( module ) {
    
    /*
     * Calculates the rotation matrix from the normalized orientation vector s, 
     * to the normalized orientation vector t.
     * */
    module.rotationMatrix4 = function( s, t ) {
        var v = vec3.cross( vec3.create(), s, t );
        var vx = v[0];
        var vy = v[1];
        var vz = v[2];
        var e = vec3.dot( s, t );
        var h = 1.0 / ( 1.0 + e );
        var out = new glMatrix.ARRAY_TYPE(16);
        out[0] = e + h*vx*vx;   out[1] = h*vx*vy - vz;  out[2] = h*vx*vz + vy;  out[3] = 0.0;
        out[4] = h*vx*vy + vz;  out[5] = e + h*vy*vy;   out[6] = h*vy*vz - vx;  out[7] = 0.0;
        out[8] = h*vx*vz - vy;  out[9] = h*vy*vz + vx;  out[10] = e + h*vz*vz;  out[11] = 0.0;
        out[12] = 0.0;          out[13] = 0.0;          out[14] = 0.0;          out[15] = 1.0;
        return out;
    };

    /*
    * A plane is defined by three points
    * (the points are glmatrix.vec objects)
    * */
    module.Plane = function( v1, v2, v3 ) {
        this.point = v1;
        this.planeVec1 = vec3.subtract( vec3.create(), v2, v1 );
        this.planeVec2 = vec3.subtract( vec3.create(), v3, v1 );
        this.normal = vec3.normalize(
            vec3.create(),
            vec3.cross(
                vec3.create(),
                this.planeVec1,
                this.planeVec2
            )
        );
    };

    /*
    * Returns the determinant of the matrix consisting of two plane
    * vectors and the point we are evaluating.
    *
    * @param v {vec3}
    * */
    module.Plane.prototype.eval = function( v ) {
        mat3.determinant( mat3.fromRows( mat3.create(), v, this.planeVec1, this.planeVec2 ) );
    };

    module.Plane.prototype.flip = function() {
        vec3.subtract( this.planeVec1, vec3.fromValues( 0.0, 0.0, 0.0 ), this.planeVec1 );
        this.normal = vec3.normalize(
            vec3.create(),
            vec3.cross(
                vec3.create(),
                this.planeVec1,
                this.planeVec2
            )
        );
    };

    module.Plane.prototype.getNormal = function() {
        return vec3.clone( this.normal );
    };

    return module;
}( morphoviewer || {} ) );