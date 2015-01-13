
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

/**
 * @namespace The morphoviewer namespace contains functions for viewing and manipulating
 * morphological data from voxel data files, or point cloud data files.
 */

var morphoviewer = ( function( tools ) {

    //the library's public interface goes here
    var module = {};

    //the webGL context
    var gl;
    //the target frame rate
    var fps = 40.0;
    //camera object, class defined in graphics.js
    var camera;
    //this is the model view matrix of the mesh.
    //the tracking ball stays centered at (0, 0, 0) at all times and thus
    //doesn't have it's own matrix
    var modelView = mat4.create();	//identity matrix, models centered at (0, 0, 0)
    var mesh;

    //position parameters of mesh
    //target position is for smooth motion interpolation
    var position = vec3.fromValues( 0.0, 0.0, 0.0 );
    var targetPosition = vec3.fromValues( 0.0, 0.0, 0.0 );

    //tracking ball
    var showTrackball = true;
    var trackball;

    var renderFunctor = function() {};	//do nothing initially

    var wireframeProgram;	//the wireframe shader program
    var illuminationProgram;//the illumination shader program
    var colorProgram;		//the surface curvature shader program
    var lineProgram;        //the shader for drawing lines
    var hemisphereProgram;  //the hemishperical lighting shader program
    var currentProgram;     //the shader program that the renderer currently uses

    /**
     * Variables for keeping track of the rendering time delta
     * */
    var timer;
    var endTime;

    /*
     * Cache the mesh data for modification and creating new mesh objects during runtime
     * This object has the same structure as the object that tools.Mesh.build( obj ) takes
     * as an argument.
     * */
    var meshCache = { vertex: [], normal: [], curvature: [], orientation: [] };

    /*
    * This is for storing the mouse's current and previous coordinates. Used in tracking mouse
    * motion deltas.
    * */
    var mouse = {
        x: 0, y:0,
        prevX: 0, prevY: 0,
        dx: 0, dy: 0 };

    var leftMouseButtonDown = false;

    /**
     * Initialize the morphoviewer.
     *
     * @param {String} canvasId the DOM id of the HTML5 canvas. If the parameter is not
     * supplied, the "glcanvas" id will be searched for.
     */
    module.initialize = function( canvasId ) {

        if ( canvasId == undefined ) {
            cid = "glcanvas";
        } else {
            cid = canvasId;
        }
        //declared globally for later use
        canvas = document.getElementById( cid );
        canvasWidth = canvas.width;
        canvasHeight = canvas.height;

        //Event handlers for input
        canvas.onmousedown = onMouseDown;
        canvas.onmouseup = onMouseUp;
        canvas.oncontextmenu = function( e ) { e.preventDefault(); };

        //add a mousewheel event listener to the canvas
        if ( canvas.addEventListener ) {
            //IE9, Chrome, Safari, Opera
            canvas.addEventListener( "mousewheel", onMouseWheel, false );
            //Firefox
            canvas.addEventListener( "DOMMouseScroll", onMouseWheel );
        } else {
            //IE6/7/8
            canvas.addEventListener( "onmousewheel", onMouseWheel );
        }

        gl = initWebGL( canvas );

        //continue only if WebGL is available and working
        if ( gl ) {
            gl.clearColor( 0.10, 0.16, 0.16, 1.0 );
            gl.enable( gl.DEPTH_TEST );
            gl.depthFunc( gl.LEQUAL );
            gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

            setInterval( drawScene, 1000.0 / fps );
        } else {
            alert( "morphoviewer.initialize: Unable to initialize WebGL. Your browser may not support it." );
        }

        timer = new Date();

        //the morphoviewer has only one camera
        var aspectRatio = canvas.clientWidth / canvas.clientHeight;
        camera = new tools.Camera( Math.PI * 60.0 / 180.0, aspectRatio, 0.01, 1000.0 );

        //build an empty mesh so that we have a valid array buffer when the shaders initialize
        mesh = new tools.Mesh( gl );
        mesh.build( {vertex:[], normal:[], curvature:[], orientation:[]} );

        //build the trackball before shaders are initialized
        trackball = new tools.Trackball( gl );

        initShaders();

        module.viewHemispherical();
    };

    function initWebGL( canvas ) {
        var context = null;
        try {
            context = canvas.getContext( "webgl" ) || canvas.getContext( "experimental-webgl" );
        } catch( e ) {
            //
        }

        return context;
    }

    function initShaders() {
        wireframeProgram = new tools.Program( gl );
        wireframeProgram.programFromString( tools.wireframe.vertex, tools.wireframe.fragment );

        colorProgram = new tools.Program( gl );
        colorProgram.programFromString( tools.color.vertex, tools.color.fragment );

        illuminationProgram = new tools.Program( gl );
        illuminationProgram.programFromString( tools.directional.vertex, tools.directional.fragment );

        hemisphereProgram = new tools.Program( gl );
        hemisphereProgram.programFromString( tools.hemisphere.vertex, tools.hemisphere.fragment );

        lineProgram = new tools.Program( gl );
        lineProgram.programFromString( tools.lineShader.vertex, tools.lineShader.fragment );
        tools.lineShader.enableAttributes( gl, lineProgram );
        tools.lineShader.setAttributes( gl, lineProgram );

        currentProgram = hemisphereProgram;
    }

    function onMouseWheel( e ) {
        var event = window.event || e;
        //prevent from scrolling the document
        event.preventDefault();
        event.stopImmediatePropagation();
        //handle dolly zoom
        var delta = event.detail ? event.detail * (-120) : event.wheelDelta;
        camera.dolly( delta * -0.0025 );
    }

    function onMouseDown( event ) {
        if ( !event.which && event.button ) {
            if ( event.button & 1 ) {		//Left
                event.which = 1;
            } else if ( event.button & 4 ) {//Middle
                event.which = 2;
            } else if ( event.button & 2 ) {//Right
                event.which = 3;
            }
        }
        /* Update mouse coordinates so that we don't create
         * a huge delta in the opposite direction
         */
        mouse.prevX = event.pageX;
        mouse.prevY = event.pageY;
        switch ( event.which ) {
            case 1:
                leftMouseButtonDown = true;
                canvas.onmousemove = function( e ) {
                    onMouseMove( e );
                    camera.orbit(
                        mouse.dx * 0.004,// * getTrackballDampeningFactor(),
                        mouse.dy * 0.004// * getTrackballDampeningFactor()
                    );
                    var rotation = 0.0;
                    var rect = canvas.getBoundingClientRect();
                    var x = mouse.x - rect.left - canvasWidth / 2.0;
                    var y = mouse.y - rect.top - canvasHeight / 2.0;
                    var factor = 0.004;
                    if ( x < 0.0 ) {
                        rotation += - factor * mouse.dy;
                    } else {
                        rotation += factor * mouse.dy;
                    }
                    if ( y < 0.0 ) {
                        rotation += - factor * mouse.dx;
                    } else {
                        rotation += factor * mouse.dx;
                    }
                    //camera.rotate( ( 1.0 - getTrackballDampeningFactor() ) * rotation );
                };
                break;
            case 3:
                canvas.onmousemove = function( e ) {
                    onMouseMove( e );
                    var up = vec3.scale(vec3.create(), camera.up(), -mouse.dy * camera.distanceFromOrigin() * 0.001 ) ;
                    var right = vec3.scale( vec3.create(), camera.right(), mouse.dx * camera.distanceFromOrigin() * 0.001 );
                    //mat4.translate( modelView, modelView, up );
                    //mat4.translate( modelView, modelView, right );
                    //targetPosition += up;
                    //targetPosition += right;
                    vec3.add( targetPosition, targetPosition, up );
                    vec3.add( targetPosition, targetPosition, right );
                };
                break;
        }
    }

    function onMouseUp( event ) {
        if ( !event.which && event.button ) {
            if ( event.button & 1 ) {		//Left
                event.which = 1;
            } else if ( event.button & 4 ) {//Middle
                event.which = 2;
            } else if ( event.button & 2 ) {//Right
                event.which = 3;
            }
        }

        switch ( event.which ) {
            case 1:
                leftMouseButtonDown = false;
                break;
            case 2:
                //
                break;
            case 3:
                //
                break;
        }
        canvas.onmousemove = function( e ) {return false;};
    }

    /**
     * Return the radius from of the current mouse coordinates from the center of the canvas. The value
     * is normalized to half the height of the canvas.
     * */
    function getDistanceFromCanvasCenter() {
        var rect = canvas.getBoundingClientRect();
        var x = canvas.width / 2.0;
        var y = canvas.height / 2.0;
        x = mouse.x - rect.left - x;
        y = mouse.y - rect.top - y;
        return 2.0 * Math.sqrt( x*x + y*y) / canvasHeight;
    }

    /**
     * Returns a factor in [0,1], which goes to zero when the current mouse position is outside the tracking ball.
     * */
    function getTrackballDampeningFactor() {
        var rad = getDistanceFromCanvasCenter();
        return Math.exp( -3.0 * ( camera.getMaxSphereRadius() / trackball.getRadius() ) * rad );
    }

    function onMouseMove( event ) {
        mouse.x = event.pageX;
        mouse.y = event.pageY;
        mouse.dx = mouse.x - mouse.prevX;
        mouse.dy = mouse.y - mouse.prevY;
        mouse.prevX = mouse.x;
        mouse.prevY = mouse.y;
    }

    /**
     * @param {Object} a
     * @param {Object} b
     * @param {Number} t
     * */
    function lerp( a, b, t ) {
        if ( t > 1.0 ) t = 1.0;
        return vec3.add(
            vec3.create(),
            a,
            vec3.scale(
                vec3.create(),
                vec3.subtract( vec3.create(), b, a ),
                t
            )
        );
    }

    function drawScene() {
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

        endTime = new Date();
        var deltaTime = endTime - timer;
        deltaTime /= 1000.0;

        //update mesh position
        position = lerp( position, targetPosition, 0.5 * (1.0 - deltaTime) );
        modelView = mat4.create();
        mat4.translate( modelView, modelView, position );

        camera.update( deltaTime );

        renderFunctor();

        if ( showTrackball ) {
            currentProgram.stopUsing();

            lineProgram.use();
            tools.lineShader.camera = camera.matrix();
            tools.lineShader.model = mat4.create();
            tools.lineShader.surfaceColor = vec3.fromValues( 0.7, 0.7, 0.7 );
            if ( leftMouseButtonDown ) {
                //blue
                tools.lineShader.surfaceColor = vec3.fromValues(0.38, 0.38, 1.0);
                tools.lineShader.setUniforms(lineProgram);
                trackball.drawXYCircle(lineProgram);
                //green
                tools.lineShader.surfaceColor = vec3.fromValues(0.38, 1.0, 0.38);
                tools.lineShader.setUniforms(lineProgram);
                trackball.drawXZCircle(lineProgram);
                //red
                tools.lineShader.surfaceColor = vec3.fromValues(1.0, 0.38, 0.38);
                tools.lineShader.setUniforms(lineProgram);
                trackball.drawYZCircle(lineProgram);
            } else {
                tools.lineShader.setUniforms( lineProgram );
                trackball.draw( lineProgram );
            }
            lineProgram.stopUsing();

            currentProgram.use();
        }

        timer = new Date();
    }

    /**
     * View a 3d file. The file can be a csv point cloud, or a .OBJ mesh file.
     *
     * @param {String} file The file URL
     * @param {String} type Can be either "obj" for .OBJ mesh file, or "point cloud" for csv point cloud.
     */
    module.viewData = function( file, type ) {
        if ( type == "obj" ) {
            tools.io.loadOBJ( file, function( model ) {
                var verts = model["v"];
                var tris = model["f"];
                var norms;
                if ( model["vn"] !== undefined ) {
                    norms = model["vn"];
                } else {
                    norms = tools.vertexNormals( verts, tris );
                }
                tools.centerPointCloud( verts );
                var verts_unwrapped = tools.unwrapVectorArray( verts, tris );
                var norms_unwrapped = tools.unwrapVectorArray( norms, tris );
                var curvature = tools.surfaceVariation( verts_unwrapped, norms_unwrapped );
                var orientation = tools.surfaceOrientation( norms_unwrapped );
                meshCache = { vertex: [], normal: [], orientation: [], curvature: [] };
                meshCache.vertex = verts_unwrapped;
                meshCache.normal = norms_unwrapped;
                meshCache.curvature = curvature;
                meshCache.orientation = orientation;

                mesh = new tools.Mesh( gl );
                mesh.build({
                    vertex: verts_unwrapped,
                    normal: norms_unwrapped
                });
                //module.viewHemispherical();
                var aabb = tools.getAabb( verts );
                trackball.setRadius( aabb.length / 2.3 );
                camera.setBestPositionForModel( aabb );
            } );

        } else if ( type == "point cloud" ) {
            tools.io.loadCSV( file, function( model ) {
                var verts = model["points"];
                tools.centerPointCloud( verts );
                var tris = tools.triangulate( verts );
                var norms = tools.vertexNormals( verts, tris );

                var verts_unwrapped = tools.unwrapVectorArray( verts, tris );
                var norms_unwrapped = tools.unwrapVectorArray( norms, tris );
                var curvature = tools.surfaceVariation( verts_unwrapped, norms_unwrapped );
                var orientation = tools.surfaceOrientation( norms_unwrapped );
                meshCache = { vertex: [], normal: [], orientation: [], curvature: [] };
                meshCache.vertex = verts_unwrapped;
                meshCache.normal = norms_unwrapped;
                meshCache.orientation = orientation;
                meshCache.curvature = curvature;
                mesh = new tools.Mesh( gl );
                mesh.build( {
                    vertex: verts_unwrapped,
                    normal: norms_unwrapped,
                    curvature: curvature,
                    orientation: orientation
                } );
                //module.viewHemispherical();
                var aabb = tools.getAabb( verts );
                trackball.setRadius( aabb.length / 2.3 );
                camera.setBestPositionForModel( aabb );
            }, ',' );

        }  else if ( type == "ply" ) {
            tools.io.loadPLY( file, function( model ) {
                var verts = [];
                var vertex = model["vertex"];
                var vertex_x = vertex["x"];
                var vertex_y = vertex["y"];
                var vertex_z = vertex["z"];
                var length = model["vertex"]["x"].length;
                for ( var i = 0; i < length; i++ ) {
                    verts.push( [ vertex_x[i], vertex_y[i], vertex_z[i] ] );
                }

                var tris = [];
                var vertex_indices = model["face"]["vertex_indices"];
                length = vertex_indices.length;
                //noinspection JSDuplicatedDeclaration
                for ( var i = 0; i < length; i++ ) {
                    tris.push( vertex_indices[i] );
                }

                var norms = [];
                if ( vertex["nx"] !== undefined ) {
                    var nx = vertex["nx"];
                    var ny = vertex["ny"];
                    var nz = vertex["nz"];
                    for ( var i = 0; i < length; i++ ) {
                        norms.push( [ nx[i], ny[i], nz[i] ] );
                    }
                } else {
                    norms = tools.vertexNormals( verts, tris );
                }

                var orientation = [];
                if ( vertex["orientation"] !== undefined ) {
                    var o = vertex["orientation"];
                    for ( var i = 0; i < length; i++ ) {
                        orientation.push( o[i] );
                    }
                }

                var curvature = [];
                if ( model["face"]["curvature"] !== undefined ) {
                    var c = model["face"]["curvature"];
                    for ( var i = 0; i < c.length; i++ ) {
                        curvature.push( c[i], c[i], c[i] );
                    }
                }
                tools.centerPointCloud( verts );
                var verts_unwrapped = tools.unwrapVectorArray( verts, tris );
                var norms_unwrapped = tools.unwrapVectorArray( norms, tris );
                meshCache = { vertex: [], normal: [], orientation: [], curvature: [] };
                meshCache.vertex = verts_unwrapped;
                meshCache.normal = norms_unwrapped;

                var meshObj = {
                    vertex: verts_unwrapped,
                    normal: norms_unwrapped
                };
                //if curvature & orientation were supplied, then add them to the object
                if ( vertex["orientation"] !== undefined ) {
                    meshObj.orientation = tools.unwrapArray( orientation, tris );
                    meshCache.orientation = meshObj.orientation;
                }
                if ( model["face"]["curvature"] !== undefined ) {
                    meshObj.curvature = curvature;
                    meshCache.curvature = curvature;
                }
                mesh = new tools.Mesh(gl);
                mesh.build( meshObj );
                //module.viewHemispherical();
                var aabb = tools.getAabb( verts );
                trackball.setRadius( aabb.length / 2.3 );
                camera.setBestPositionForModel( aabb );
            } );

        } else {
            throw "morphoviewer.viewData: unrecognized 3d file type";
        }
    };

    /**
     * View the object as a wire frame model.
     * */
    module.viewWireframe = function() {
        currentProgram = wireframeProgram;
        currentProgram.use();
        setWireFrame();

        renderFunctor = function() {
            mesh.bind();
            tools.wireframe.setAttributes( gl, currentProgram, mesh.vertices() );
            tools.wireframe.camera = camera.matrix();
            tools.wireframe.model = modelView;
            tools.wireframe.setUniforms( currentProgram );
            gl.drawArrays( gl.TRIANGLES, 0, mesh.vertices() );
            mesh.unbind();
        };
    };

    function setWireFrame() {
        mesh.bind();
        tools.wireframe.enableAttributes(gl, currentProgram);
        tools.wireframe.setAttributes(gl, currentProgram, mesh.vertices());
        mesh.unbind();
    }

    /**
     * Color the surface of the object according to the discreet orientation of each polygon.
     *
     * If the currently active mesh doesn't have any orientation data, then this function doesn't do anything.
     * */
    module.viewSurfaceOrientation = function() {
        //if the mesh doesn't have orientation data, then return immediately
        if ( !mesh.has( "orientation" ) ) {
            return;
        }
        if ( currentProgram.object != colorProgram.object ) {
            currentProgram = colorProgram;
            currentProgram.use();
            setupColorShader();
        }
        tools.color.colorMode = 2;
    };

    /**
     * Color the surface of the object according to its local surface curvature.
     *
     * If the currently active mesh doesn't have curvature data, then this function doesn't do anything.
     * */
    module.viewSurfaceCurvature = function() {
        if ( !mesh.has( "curvature" ) ) {
            return;
        }
        if ( currentProgram.object != colorProgram.object ) {
            currentProgram = colorProgram;
            currentProgram.use();
            setupColorShader();
        }
        tools.color.colorMode = 1;
    };

    function setupColorShader() {
        mesh.bind();
        tools.color.enableAttributes( gl, currentProgram );
        tools.color.setAttributes( gl, currentProgram, mesh.vertices(), mesh );
        mesh.unbind();

        renderFunctor = function() {
            mesh.bind();
            tools.color.setAttributes( gl, currentProgram, mesh.vertices(), mesh );
            tools.color.camera = camera.matrix();
            tools.color.model = modelView;
            tools.color.setUniforms( currentProgram );
            gl.drawArrays( gl.TRIANGLES, 0, mesh.vertices() );
            mesh.unbind();
        }
    }

    /**
     * Set the directional light shader as the active shader.
     * */
    module.viewIlluminated = function() {
        currentProgram = illuminationProgram;
        currentProgram.use();

        mesh.bind();
        tools.directional.enableAttributes( gl, currentProgram );
        tools.directional.setAttributes( gl, currentProgram, mesh.vertices() );
        mesh.unbind();

        renderFunctor = function() {
            mesh.bind();
            tools.directional.setAttributes( gl, currentProgram, mesh.vertices() );
            tools.directional.camera = camera.matrix();
            tools.directional.model = modelView;
            tools.directional.cameraPosition = camera.getPosition();
            tools.directional.setUniforms( currentProgram );

            gl.drawArrays( gl.TRIANGLES, 0, mesh.vertices() );
            mesh.unbind();
        }
    };

    /**
     * View the model under a hemispherical light source.
     * */
    module.viewHemispherical = function() {
        currentProgram = hemisphereProgram;
        currentProgram.use();

        mesh.bind();
        tools.hemisphere.enableAttributes( gl, currentProgram );
        tools.hemisphere.setAttributes( gl, currentProgram, mesh.vertices() );
        mesh.unbind();

        renderFunctor = function() {
            mesh.bind();
            tools.hemisphere.setAttributes( gl, currentProgram, mesh.vertices() );
            tools.hemisphere.camera = camera.matrix();
            tools.hemisphere.model = modelView;
            tools.hemisphere.setUniforms( currentProgram );

            gl.drawArrays( gl.TRIANGLES, 0, mesh.vertices() );
            mesh.unbind();
        }
    };

    /**
     * View with orthographic projection.
     */
    module.viewOrtho = function() {
        camera.viewAsOrtho();
    };

    /**
     * View with perspective projection.
     */
    module.viewPerspective = function() {
        camera.viewAsPerspective();
    };

    module.viewLeft = function() {
        targetPosition = vec3.fromValues( 0.0, 0.0, 0.0 );
        camera.positionLeft();
    };

    module.viewRight = function() {
        targetPosition = vec3.fromValues( 0.0, 0.0, 0.0 );
        camera.positionRight();
    };

    module.viewTop = function() {
        targetPosition = vec3.fromValues( 0.0, 0.0, 0.0 );
        camera.positionTop();
    };

    module.viewBottom = function() {
        targetPosition = vec3.fromValues( 0.0, 0.0, 0.0 );
        camera.positionBottom();
    };

    module.viewFront = function() {
        targetPosition = vec3.fromValues( 0.0, 0.0, 0.0 );
        camera.positionFront();
    };

    module.viewBack = function() {
        targetPosition = vec3.fromValues( 0.0, 0.0, 0.0 );
        camera.positionBack();
    };

    /**
     * Show the tracking ball (on by default).
     * */
    module.showTrackingball = function() {
        showTrackball = true;
    };

    /**
     * Hide the tracking ball.
     * */
    module.hideTrackingball = function() {
        showTrackball = false;
    };

    module.color = {
        black: vec3.fromValues( 0.0, 0.0, 0.0 ),
        white: vec3.fromValues( 1.0, 1.0, 1.0 ),
        lightgray: vec3.fromValues( 0.91, 0.91, 0.91 ),
        lightgrey: vec3.fromValues( 0.91, 0.91, 0.91 ),
        darkgray: vec3.fromValues( 0.41, 0.41, 0.41 ),
        darkgrey: vec3.fromValues( 0.41, 0.41, 0.41 )
    };

    /**
     * Set the background color of the viewport.
     *
     * @param {vec3} color A vector containing the RGB color.
     * */
    module.setBackgroundColor = function( color ) {
        gl.clearColor(
            color[0],
            color[1],
            color[2],
            1.0
        );
    };

    module.setLightPolarAngle = function( theta ) {
        tools.hemisphere.polar = theta;
    };

    module.setLightAzimuthalAngle = function( phi ) {
        tools.hemisphere.azimuth = phi;
    };

    module.calculateOrientation = function() {
        meshCache.orientation = tools.surfaceOrientationAboutCamera( meshCache.normal, camera.rotation() );
        mesh = new tools.Mesh(gl);
        mesh.build( meshCache );
    };

    //re-export the io namespace
    module.io = {};
    module.io.loadPLY = tools.io.loadPLY;
    module.io.loadOBJ = tools.io.loadOBJ;
    module.io.loadCSV = tools.io.loadCSV;

    return module;
}( morphoviewer ));


