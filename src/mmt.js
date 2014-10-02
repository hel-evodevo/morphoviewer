
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

/*This file (morphoviewer mesh tools) contains tools for loading point clouds, mesh files, and generating
* vertex data (vertex normals, face normals, surface curvature, surface orientation)
* for them.*/
var morphoviewer = ( function( module ) {

    var EPSILON = 1.0 / 1048576.0;

    function loadFile( file, onload ) {
        var request = new XMLHttpRequest();
        request.open( "GET", file, true );	//gets performed asynchronously
        request.responseType = "arraybuffer";
        request.onload = function ( e ) { onload( e.target.response); };
        request.send();
    }

    /**
     * Load and parse a vertex array from an .OBJ file.
     *
     * @param {String} file the file which we want to load
     * @param {Function} onload the function passes the following object to
     * onload: { vertices: {Array}, normals: {Array}, indices: {Array} }, where the
     * first two are arrays of triplets, each triplet representing a point or normal,
     * respectively. The indices array is an array of triplets containing indices, specifying
     * how the mesh is triangulated.
     */
    module.vertexArrayFromOBJ = function( file, onload ) {
        var loader = function( data ) {
            var model = parseOBJ( data );

            if ( onload != undefined ) {
                onload( model );
            }
        };

        loadFile( file, loader );
    };

    /**
     * Load a point cloud file into a vertex array.
     *
     * @param {String} file
     * @param {Function} onload this function gets passed as the single argument an array of triplets
     * @param {String} delimiter the delimiter used in the point cloud file to separate values (comma by default)
     */
    module.vertexArrayFromPointCloud = function( file, onload, delimiter ) {
        if ( typeof(delimiter) === 'undefined' ) {
            delimiter = ',';
        }

        var loader = function( data ) {
            var points = parsePointCloud( data, delimiter );

            if ( onload != undefined ) {
                onload( points )
            }
        };

        loadFile( file, loader );
    };

    /*Parses a buffer containing a point cloud in xyz format.
     * Returns them in an array of triplets*/
    function parsePointCloud( buffer, delimiter ) {
        var p = [];

        var a = new Uint8Array( buffer );
        var off = 0.0;

        while ( off < a.length ) {
            var line = readLine( a, off );
            off += line.length + 1;

            var tokens = line.split( delimiter );
            p.push( [
                parseFloat( tokens[0] ),
                parseFloat( tokens[1] ),
                parseFloat( tokens[2] )
            ] );
        }

        return p;
    }

    module.vertexArrayFromMorphobuffer = function( file, onload ) {
        var loader = function( buffer ) {
            var model = parseMorphobuffer( buffer );
            if ( onload != undefined ) {
                onload( model );
            }
        };

        loadFile( file, loader );
    };

    function parseMorphobuffer( buffer ) {
        var bytes = new Uint8Array( buffer );
        var m = {
            vertices: { v: [], i: [] },
            normals: [],
            curvature: [],
            orientation: []
        };
        var view = jDataView( bytes );
        while ( view.tell() < bytes.length ) {
            //get the identifier of the following bytes
            var c = view.getChar();
            if ( c == "v" ) {
                m.vertices.v.push([
                    view.getFloat64(),
                    view.getFloat64(),
                    view.getFloat64()
                ]);
            } else if ( c == 't' ) {
                m.vertices.i.push([
                    view.getUint32(),
                    view.getUint32(),
                    view.getUint32()
                ]);
            } else if ( c == 'n' ) {
                m.normals.push( view.getFloat64() );
                m.normals.push( view.getFloat64() );
                m.normals.push( view.getFloat64() );
            } else if ( c == 'c' ) {
                var curves = view.getFloat64();
                m.curvature.push( curves );
                m.curvature.push( curves );
                m.curvature.push( curves );
            } else if ( c == 'o' ) {
                m.orientation.push( view.getFloat64() );
            }
        }
        return m;
    }

    /*Parses a buffer containing data from a wavefront .OBJ file
     * Returns vertices, their triangulation, and vertex normals, if possible
     * This parser does not do anything with groups.*/
    function parseOBJ( buffer ) {
        //the model
        var m = { vertices: { v: [], i: [] }, normals: { v: [], i: [] } };

        var offset = 0.0;
        var chars = new Uint8Array( buffer );

        while ( offset < chars.length ) {
            var line = readLine( chars, offset );
            offset += line.length + 1;
            line = line.replace(/ +(?= )/g,'');
            line = line.replace(/(^\s+|\s+$)/g, '');
            var tokens = line.split(" ");

            if ( tokens[0] == "v" ) {
                m.vertices.v.push( [
                    parseFloat( tokens[1] ),
                    parseFloat( tokens[2] ),
                    parseFloat( tokens[3] )
                ] );
            }
            if ( tokens[0] == "vn" ) {
                m.normals.v.push( [
                    parseFloat( tokens[1] ),
                    parseFloat( tokens[2] ),
                    parseFloat( tokens[3] )
                ] );
            }
            if ( tokens[0] == "f" ) {
                var vlen = m.vertices.v.length;
                var nlen = m.normals.v.length;
                var i1 = tokens[1].split("/");

                if ( i1.length == 1 ) {
                    i1 = parseInt( i1 ) - 1;
                    if ( i1 < 0 ) i1 = vlen + i1 + 1;
                    for ( var j = 2; j < tokens.length - 1; j ++ ) {
                        var i2 = parseInt( tokens[j] ) - 1;
                        var i3 = parseInt( tokens[j+1] ) - 1;
                        if ( i2 < 0 ) {
                            i2 = vlen + i2 + 1;
                            i3 = vlen + i3 + 1;
                        }
                        m.vertices.i.push( [i1, i2, i3] );
                        if ( m.normals.v.length > 0 ) {
                            m.normals.i.push( [i1, i2, i3] );
                        }
                    }
                } else {
                    var vi1 = parseInt( i1[0] ) - 1;
                    var ni1 = parseInt( i1[2] ) - 1;

                    if ( vi1 < 0 ) vi1 = vlen + vi1 + 1;
                    if ( ni1 < 0 ) ni1 = nlen + ni1 + 1;

                    //general case for handling convex polygons
                    for ( var j = 2; j < tokens.length - 1; j++ ) {
                        //get the next two vertices of the triangle
                        var i2 = tokens[j].split("/");
                        var i3 = tokens[j+1].split("/");
                        var vi2 = parseInt( i2[0] ) - 1;
                        var vi3 = parseInt( i3[0] ) - 1;
                        var ni2 = parseInt( i2[2] ) - 1;
                        var ni3 = parseInt( i3[2] ) - 1;
                        //handle face definition using negative indices
                        if ( vi2 < 0 ) {
                            vi2 = vlen + vi2 + 1;
                            vi3 = vlen + vi3 + 1;
                        }
                        if ( ni2 < 0 ) {
                            ni2 = nlen + ni2 + 1;
                            ni3 = nlen + ni3 + 1;
                        }
                        m.vertices.push( [vi1, vi2, vi3] );
                        m.normals.push( [ni1, ni2, ni3] );
                    }
                }
            }
        }

        return m;
    }

    /*chars is {Uint8Array} and offset is {Number}*/
    function readLine( chars, offset ) {
        var s = "";
        while( chars[ offset ] != 10 ) {
            s += String.fromCharCode( chars[ offset++ ] );
        }
        return s;
    }

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
     * Center the point cloud on the origin.
     *
     * @param {Array} points an array of triplets, each triplet representing a (x, y, z) point.
     */
    module.centerPointCloud = function( points ) {
        var cov = centerOfVolume( points );

        for ( var i = 0; i < points.length; i++ ) {
            points[i][0] -= cov[0];
            points[i][1] -= cov[1];
            points[i][2] -= cov[2];
        }
    };

    /**
     * Get the unwrapped (containing repeated vertices) array
     *
     * @returns {Array} the unwrapped array of vertex coordinates.
     */
    module.unwrapArray = function( v, inds ) {
        var verts = [];
        for ( var i = 0; i < inds.length; i++ ) {
            if ( inds[i][0] >= v.length || inds[i][1] >= v.length || inds[i][2] >= v.length ) {
                console.log( inds[i][0] + " " + inds[i][1] + " " + inds[i][2] + ", length: " + v.length );
                throw "MESH FAILURE";
            }
            verts.push( v[inds[i][0]][0], v[inds[i][0]][1], v[inds[i][0]][2] );	//first vertex
            verts.push( v[inds[i][1]][0], v[inds[i][1]][1], v[inds[i][1]][2] );	//second vertex
            verts.push( v[inds[i][2]][0], v[inds[i][2]][1], v[inds[i][2]][2] );	//third vertex
        }
        return verts;
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

        return {
            min: { x: xmin, y: ymin, z: zmin },
            max: { x: xmax, y: ymax, z: zmax },
            center: { x: xmin+xmax / 2.0, y: ymin+ymax / 2.0, z: zmin+zmax / 2.0 }
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

    /**
     * Calculates the per-vertex normal for each vertex in an array list. This operation
     * has O(N) time complexity.
     *
     * @param {Array} verts an array of triplets, where each triplet represents a coordinate
     * @param {Array} ind an array of triplets, where each triplet represents a triangle (three indices into vertex array)
     * @returns {Array} an array which matches a vertex array with each vertex given in the input array.
     */
    module.vertexNormals = function( verts, ind ) {
        /*construct adjacency list*/
        var adjacency = new Array( verts.length );	//store neighboring points
        for ( var i = 0; i < verts.length; i++ ) {
            adjacency[i] = [];
        }
        for ( var i = 0; i < ind.length; i++ ) {
            adjacency[ ind[i][0] ].push( ind[i][1], ind[i][2] );
            adjacency[ ind[i][1] ].push( ind[i][0], ind[i][2] );
            adjacency[ ind[i][2] ].push( ind[i][0], ind[i][1] );
        }

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
    }

    /**
     * Calculates the surface variation, by calculating the Dirichlet Energy for
     * each polygon on the surface. The method has been developed based on the publication
     * "Comparing Dirichlet normal surface energy of tooth crowns,
     * a new technique of molar shape quantification for dietary inference,
     * with previous methods in isolation and in combination".
     *
     * @param {Array} verts unwrapped vertex array
     * @param {Array} vNorms	unwrapped vertex normal array
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
            /*apply a curve to increase "contrast" of the lower curvature values.*/
            scalars[i] = 1 - Math.exp(2.99572315 - 15*scalars[i]) / 20.0;
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

    /*norms: the unwrapped vertex normals
     * returns: an array of scalars for each vertex representing the orientation*/
    module.surfaceOrientation = function( norms ) {
        var regions = [];
        var n = 8;	//the number of orientations we are going to consider
        for ( var i = 0; i < norms.length; i += 3 ) {
            var or = vec2.normalize( vec2.create(), vec2.fromValues( norms[i], norms[i+1]) );
            var theta = angleRangeClamp( Math.atan2( or[1], or[0] ) );
            var region = Math.floor( theta / ( 2.0 * Math.PI / n) );	//find the region number in [1, n]

            region /= n-1;	//normalize!
            regions.push( region );
        }
        return regions;
    };

    function angleRangeClamp( angle ) {
        if ( angle > Math.PI * 2.0 ) {
            return angle - Math.PI * 2.0;
        } else if ( angle < 0.0 ) {
            return angle + Math.PI * 2.0;
        }
        return angle;
    }

    return module;
}( morphoviewer || {} ) );


