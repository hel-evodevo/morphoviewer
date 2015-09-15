
var morphoviewer = ( function( module ) {

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
                this.PlaneVec1,
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
    };

    return module;
}( morphoviewer || {} ) );