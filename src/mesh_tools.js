/**
 * This file adds mesh processing tools to the morphoviewer namespace. The tools include functions
 * for calculating vertex normals, triangulation, and calculating various surface properties.
 * */
var morphoviewer = ( function( module ) {

    function centerOfVolume( points ) {
        var covX = 0.0;	//center of colume for each coordinate
        var covY = 0.0;
        var covZ = 0.0;

        for ( var i = 0; i < points.length; i++ ) {
            covX += points[i][0];
            covY += points[i][1];
            covZ += points[i][2];
        }

        covX /= points.length;
        covY /= points.length;
        covZ /= points.length;
        return [ covX, covY, covZ ];
    }

    /**
     * @brief Center the point cloud on the origin.
     * @param points {Array} The points
     * @param arraytype {String} "wrapped" (by default), or "unwrapped".
     * */
    module.centerPointCloud = function( points, arraytype ) {
        if ( typeof( arraytype ) === "undefined" ) {
            arraytype = "wrapped";
        }
        if ( arraytype === "wrapped" ) {
            centerPointCloudWrapped( points );
        } else if ( arraytype === "unwrapped" ) {
            centerPointCloudUnwrapped( points );
        }
    };

    /**
     * Center the point cloud on the origin.
     *
     * @param {Array} points an array of triplets, each triplet representing a (x, y, z) point.
     */
    function centerPointCloudWrapped( points ) {
        var cov = centerOfVolume( points );

        for ( var i = 0; i < points.length; i++ ) {
            points[i][0] -= cov[0];
            points[i][1] -= cov[1];
            points[i][2] -= cov[2];
        }
    }

    function centerPointCloudUnwrapped( points ) {
        var covX = 0.0;	//center of colume for each coordinate
        var covY = 0.0;
        var covZ = 0.0;

        for ( var i = 0; i < points.length; i += 3 ) {
            covX += points[i];
            covY += points[i+1];
            covZ += points[i+2];
        }

        covX /= points.length;
        covY /= points.length;
        covZ /= points.length;

        for ( var i = 0; i < points.length; i += 3 ) {
            points[i] -= covX;
            points[i+1] -= covY;
            points[i+2] -= covZ;
        }
    }


    /**
     * Get the unwrapped (containing repeated vertices) array
     *
     * @returns {Array} an array of floating point values, each group of three represents one point
     */
    module.unwrapVectorArray = function( v, inds ) {
        var verts = [];
        for ( var i = 0; i < inds.length; i++ ) {
            verts.push( v[inds[i][0]][0], v[inds[i][0]][1], v[inds[i][0]][2] );	//first vertex
            verts.push( v[inds[i][1]][0], v[inds[i][1]][1], v[inds[i][1]][2] );	//second vertex
            verts.push( v[inds[i][2]][0], v[inds[i][2]][1], v[inds[i][2]][2] );	//third vertex
        }
        return verts;
    };

    module.unwrapArray = function( v, inds ) {
        var values = [];
        for ( var i = 0; i < inds.length; i++ ) {
            values.push(
                v[ inds[i][0] ],
                v[ inds[i][1] ],
                v[ inds[i][2] ]
            );
        }
        return values;
    };

    /**
     * Finds the min and max points of an array of vertices.
     *
     * @returns {Object} an object containing min and max fields, each containing x, y, and z fields.
     */
    module.getAabb = function( verts ) {
        var xmin = Number.POSITIVE_INFINITY,
            xmax = Number.NEGATIVE_INFINITY,
            ymin = Number.POSITIVE_INFINITY,
            ymax = Number.NEGATIVE_INFINITY,
            zmin = Number.POSITIVE_INFINITY,
            zmax = Number.NEGATIVE_INFINITY;

        for ( var i = 0; i < verts.length; i++ ) {
            if ( verts[i][0] < xmin ) { xmin = verts[i][0]; }
            if ( verts[i][0] > xmax ) { xmax = verts[i][0]; }
            if ( verts[i][1] < ymin ) { ymin = verts[i][1]; }
            if ( verts[i][1] > ymax ) { ymax = verts[i][1]; }
            if ( verts[i][2] < zmin ) { zmin = verts[i][2]; }
            if ( verts[i][2] > zmax ) { zmax = verts[i][2]; }
        }

        var sqrDist = ( xmax - xmin ) * (xmax - xmin );
        sqrDist += ( ymax - ymin ) * ( ymax - ymin );
        sqrDist += ( zmax - zmin ) * ( zmax - zmin );

        return {
            width: xmax - xmin,
            height: ymax - ymin,
            min: { x: xmin, y: ymin, z: zmin },
            max: { x: xmax, y: ymax, z: zmax },
            center: { x: xmin+xmax / 2.0, y: ymin+ymax / 2.0, z: zmin+zmax / 2.0 },
            length: Math.sqrt( sqrDist )
        };
    };

    module.getAabbFromUnwrapped = function( verts ) {
        var xmin = Number.POSITIVE_INFINITY,
            xmax = Number.NEGATIVE_INFINITY,
            ymin = Number.POSITIVE_INFINITY,
            ymax = Number.NEGATIVE_INFINITY,
            zmin = Number.POSITIVE_INFINITY,
            zmax = Number.NEGATIVE_INFINITY;

        for ( var i = 0; i < verts.length; i += 3 ) {
            if ( verts[i] < xmin ) { xmin = verts[i]; }
            if ( verts[i] > xmax ) { xmax = verts[i]; }
            if ( verts[i+1] < ymin ) { ymin = verts[i+1]; }
            if ( verts[i+1] > ymax ) { ymax = verts[i+1]; }
            if ( verts[i+2] < zmin ) { zmin = verts[i+2]; }
            if ( verts[i+2] > zmax ) { zmax = verts[i+2]; }
        }

        var sqrDist = ( xmax - xmin ) * (xmax - xmin );
        sqrDist += ( ymax - ymin ) * ( ymax - ymin );
        sqrDist += ( zmax - zmin ) * ( zmax - zmin );

        return {
            min: { x: xmin, y: ymin, z: zmin },
            max: { x: xmax, y: ymax, z: zmax },
            center: { x: xmin+xmax / 2.0, y: ymin+ymax / 2.0, z: zmin+zmax / 2.0 },
            length: Math.sqrt( sqrDist )
        };
    };

    /**
     * Build a triangulated mesh out of a set of points.
     *
     * @param {Array} verts an array of triplets, where each triplet represents a point coordinate
     * @returns {Array} an array containing triplets of indices denoting triangles
     */
    module.triangulate = function( verts ) {
        var unwrapped_tris = Delaunay.triangulate( verts );
        var tris = [];
        for ( var i = 0; i < unwrapped_tris.length; i+=3 ) {
            tris.push( [
                unwrapped_tris[i],
                unwrapped_tris[i+1],
                unwrapped_tris[i+2]
            ]);
        }
        return tris;
    };
    /**
     * Calculates face normals for each triangle. This operation has O(N) time
     * complexity.
     *
     * @param {Array} verts an array of coordinates, arranged in triplets for each point.
     * @param {Array} ind an array of indices, arranged in triplets
     * @returns {Array} an array which matches a normal with each vertex in the input array.
     */
    module.faceNormals = function( verts, ind ) {
        var norms = new Array( verts.length );
        for ( var i = 0; i < ind.length; i++ ) {
            var a = vec3.fromValues(
                    verts[ ind[i][1] ][0] - verts[ ind[i][0] ][0],
                    verts[ ind[i][1] ][1] - verts[ ind[i][0] ][1],
                    verts[ ind[i][1] ][2] - verts[ ind[i][0] ][2]
            );
            var b = vec3.fromValues(
                    verts[ ind[i][2] ][0] - verts[ ind[i][0] ][0],
                    verts[ ind[i][2] ][1] - verts[ ind[i][0] ][1],
                    verts[ ind[i][2] ][2] - verts[ ind[i][0] ][2]
            );
            var n = vec3.cross( vec3.create(), a, b );
            vec3.normalize( n, n );

            norms[ ind[i][0] ] = [ n[0], n[1], n[2] ];
            norms[ ind[i][1] ] = [ n[0], n[1], n[2] ];
            norms[ ind[i][2] ] = [ n[0], n[1], n[2] ];
        }
        return norms;
    };

    /*Pretty much the same, except for the lack of normalization*/
    function faceVectors( verts, ind ) {
        var norms = new Array( verts.length );
        for ( var i = 0; i < ind.length; i++ ) {
            var a = vec3.fromValues(
                    verts[ ind[i][1] ][0] - verts[ ind[i][0] ][0],
                    verts[ ind[i][1] ][1] - verts[ ind[i][0] ][1],
                    verts[ ind[i][1] ][2] - verts[ ind[i][0] ][2]
            );
            var b = vec3.fromValues(
                    verts[ ind[i][2] ][0] - verts[ ind[i][0] ][0],
                    verts[ ind[i][2] ][1] - verts[ ind[i][0] ][1],
                    verts[ ind[i][2] ][2] - verts[ ind[i][0] ][2]
            );
            var n = vec3.cross( vec3.create(), a, b );

            norms[ ind[i][0] ] = [ n[0], n[1], n[2] ];
            norms[ ind[i][1] ] = [ n[0], n[1], n[2] ];
            norms[ ind[i][2] ] = [ n[0], n[1], n[2] ];
        }
        return norms;
    }

    module.adjacencyList = function( verts, ind ) {
        var adjacency = new Array( verts.length );
        for ( var i = 0; i < verts.length; i++ ) {
            adjacency[i] = [];
        }
        for ( var i = 0; i < ind.length; i++ ) {
            adjacency[ ind[i][0] ].push( ind[i][1], ind[i][2] );
            adjacency[ ind[i][1] ].push( ind[i][0], ind[i][2] );
            adjacency[ ind[i][2] ].push( ind[i][0], ind[i][1] );
        }

        return adjacency;
    };

    /**
     * Calculates the per-vertex normal for each vertex in an array list. This operation
     * has O(N) time complexity.
     *
     * @param {Array} verts an array of triplets, where each triplet represents a coordinate
     * @param {Array} ind an array of triplets, where each triplet represents a triangle (three indices into vertex array)
     * @returns {Array} an array which matches a vertex array with each vertex given in the input array.
     */
    module.vertexNormals = function( verts, ind, adjacency ) {
        var faceVecs = faceVectors( verts, ind );
        var norms = new Array( verts.length );

        for ( var i = 0; i < verts.length; i++ ) {
            var n = vec3.fromValues( 0.0, 0.0, 0.0 );
            for ( var j = 0; j < adjacency[i].length; j++ ) {
                vec3.add( n,
                    n,
                    vec3.fromValues(
                        faceVecs[ adjacency[i][j] ][0],
                        faceVecs[ adjacency[i][j] ][1],
                        faceVecs[ adjacency[i][j] ][2]
                    )
                );
            }
            vec3.normalize( n, n );
            norms[i] = new Array(3);
            norms[i][0] = n[0];
            norms[i][1] = n[1];
            norms[i][2] = n[2];
        }

        return norms;
    };

    /**
     * Calculates the surface variation, by calculating the Dirichlet Energy for
     * each polygon on the surface. The method has been developed based on the publication
     * "Comparing Dirichlet normal surface energy of tooth crowns,
     * a new technique of molar shape quantification for dietary inference,
     * with previous methods in isolation and in combination".
     *
     * @param {Array} verts unwrapped vertex array
     * @param {Array} vNorms unwrapped vertex normal array
     * @returns {Array} Gives each vertex a color based on the surface variation of the polygon.
     */
    module.surfaceVariation = function( verts, vNorms ) {
        var largest = Number.NEGATIVE_INFINITY;	//the values should only be positive
        var smallest = Number.POSITIVE_INFINITY;
        var scalars = [];
        //the energy density at point p is calculated from
        // e(p) = tr(G^-1 * H), where G and H are matrices:
        // G = ( dot(u,u), dot(u,v), dot(uv), dot(vv)) and
        // H = ( dot(nu,nu), dot(nu, nv), dot(nu, nv), dot(nv, nv) )
        //this essentially measures how "spread out" the vertex normals are for
        //each triangle
        for ( var i = 0; i < verts.length; i += 9 ) {
            //build the matrix G
            var u = vec3.fromValues(
                    verts[i+3] - verts[i],
                    verts[i+4] - verts[i+1],
                    verts[i+5] - verts[i+2]
            );
            var v = vec3.fromValues(
                    verts[i+6] - verts[i],
                    verts[i+7] - verts[i+1],
                    verts[i+8] - verts[i+2]
            );
            var G = mat2.create();
            G[0] = vec3.dot( u, u );
            G[1] = vec3.dot( u, v );
            G[2] = vec3.dot( u, v );
            G[3] = vec3.dot( v, v );

            //build the matrix H
            var nu = vec3.fromValues(
                    vNorms[i+3] - vNorms[i],
                    vNorms[i+4] - vNorms[i+1],
                    vNorms[i+5] - vNorms[i+2]
            );
            var nv = vec3.fromValues(
                    vNorms[i+6] - vNorms[i],
                    vNorms[i+7] - vNorms[i+1],
                    vNorms[i+8] - vNorms[i+2]
            );
            var H = mat2.create();
            H[0] = vec3.dot( nu, nu );
            H[1] = vec3.dot( nu, nv );
            H[2] = vec3.dot( nu, nv );
            H[3] = vec3.dot( nv, nv );

            //calculate G^-1 * H:
            var res = mat2.create();
            mat2.invert( G, G );
            mat2.multiply( res, G, H );
            var trace = res[0] + res[3];
            trace = clampTrace( trace );

            //we store one scalar value per triangle
            scalars.push( trace );
            scalars.push( trace );
            scalars.push( trace );

            //store the largest encountered trace for normalization
            if ( trace > largest ) {
                largest = trace;
            } else if ( trace < smallest ) {
                smallest = trace;
            }
        }

        for ( var i = 0; i < scalars.length; i++ ) {
            scalars[i] /= largest;	//normalize!
        }

        return scalars;
    };

    /*A dirty hack: sometimes the curvature will be E+8 times larger than
     * the smallest value, meaning color variation are not visible. This clamps it so
     * that the range is more reasonable.*/
    function clampTrace( trace ) {
        if ( trace > 1000.0 ) {
            trace = 1000.0;
        }
        return trace;
    }

    /* norms: the unwrapped vertex normals
     * returns: an array of scalars for each vertex representing the orientation*/
    module.surfaceOrientation = function( norms ) {
        var regions = [];
        var n = 8;	//the number of orientations we are going to consider
        for ( var i = 0; i < norms.length; i += 3 ) {
            var or = vec2.normalize( vec2.create(), vec2.fromValues( norms[i], norms[i+1]) );
            var theta = module.angleRangeClamp( Math.atan2( or[1], or[0] ) );
            var region = Math.floor( theta / ( 2.0 * Math.PI / n) );	//find the region number in [1, n]

            region /= n-1;	//normalize!
            regions.push( region );
        }
        return regions;
    };


    /**
     * Returns the surface orientation values about the forward transform of the camera
     *
     * norms - a vector of unwrapped vertex normals
     * mat - the camera rotation matrix
     * */
    module.surfaceOrientationAboutCamera = function( norms, mat ) {
        var regions = [];
        var n = 8;  //the number of orientations we are going to consider
        for ( var i = 0; i < norms.length; i+= 3 ) {
            //horrid manual matrix math, to avoid object allocation
            var v1 = mat[0]*norms[i] + mat[1]*norms[i+1] + mat[2]*norms[i+2];
            var v2 = mat[3]*norms[i] + mat[4]*norms[i+1] + mat[3]*norms[i+2];
            var or = vec2.normalize( vec2.create(), vec2.fromValues(v1, v2) );
            var theta = module.angleRangeClamp( Math.atan2( or[1], or[0] ) );
            var region = Math.floor( theta / ( 2.0 * Math.PI / n) );

            region /= n-1;
            regions.push( region );
        }
        return regions;
    };

    /*
    * This takes wrapped vertices as an argument
    * */
    module.modelArea = function( verts, tris ) {
        var size = 0.0;
        /*
        * The area is calculated exactly the same way as below, in opc()
        * */
        for ( var i = 0; i < tris.length; i++ ) {
            var a = [
                verts[tris[i][0]][0] - verts[tris[i][1]][0],
                verts[tris[i][0]][1] - verts[tris[i][1]][1],
                verts[tris[i][0]][2] - verts[tris[i][1]][2]
            ];
            var b = [
                verts[tris[i][0]][0] - verts[tris[i][2]][0],
                verts[tris[i][0]][1] - verts[tris[i][2]][1],
                verts[tris[i][0]][2] - verts[tris[i][2]][2]
            ];
            var r = [
                a[1]*b[2] - a[2]*b[1],
                a[2]*b[0] - a[0]*b[2],
                a[0]*b[1] - a[1]*b[0]
            ];
            size += Math.sqrt( r[0]*r[0] + r[1]*r[1] + r[2]*r[2] );
        }
        return size;
    };

    module.opc = function( verts, adjacency, orientation, lowerPercentage, totalArea ) {
        var explored = [];
        for ( var i = 0; i < verts.length; i++ ) {
            explored.push( false );
        }
        var stack = [];
        var count = 0;

        var explore = function explr( verts, adjacency, orientation, index ) {
            var recursion = [];
            var size = 0;
            recursion.push( index );
            do {
                var k = recursion.pop();
                a = null;
                b = null;
                explored[k] = true;
                for (var n = 0; n < adjacency[k].length; n++) {
                    var neighbor = adjacency[k][n];
                    /*
                     * If we haven't already visited the vertex, then
                     * */
                    if (!explored[neighbor]) {
                        /*
                         * Check to see if it has the same orientation. If it does, get the surface area of the
                         * formed triangle, and add that to the size accumulator.
                         *
                         * If it doesn't,
                         * */
                        if (orientation[neighbor] === orientation[k]) {
                            b = a;
                            a = [
                                verts[n][0] - verts[k][0],
                                verts[n][1] - verts[k][2],
                                verts[n][1] - verts[k][2]
                            ];
                            if ( a && b ) {
                                var r = [
                                    a[1]*b[2] - a[2]*b[1],
                                    a[2]*b[0] - a[0]*b[2],
                                    a[0]*b[1] - a[1]*b[0]
                                ];
                                size += Math.sqrt( r[0]*r[0] + r[1]*r[1] + r[2]*r[2] );
                            }
                            recursion.push( neighbor );
                        }
                        /*
                         * then, stick it into the neighboring patch stack.
                         * */
                        else {
                            stack.push( neighbor );   //captured from outside
                        }
                    }
                }
            } while( recursion.length != 0 );
            return size;
        };

        stack.push(0);
        do {
            var i = stack.pop();
            if ( !explored[i] ) {
                var size = explore( verts, adjacency, orientation, i );
                // normalize the size so that it is a percentage
                size /= totalArea;
                if ( size > lowerPercentage ) {
                    count += 1;
                }
            }
        } while( stack.length != 0 );

        return count;
    };

    module.angleRangeClamp = function( angle ) {
        if ( angle > Math.PI * 2.0 ) {
            return angle - Math.PI * 2.0;
        } else if ( angle < 0.0 ) {
            return angle + Math.PI * 2.0;
        }
        return angle;
    };

    return module;
}( morphoviewer || {} ) );


