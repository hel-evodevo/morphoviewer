
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

    //public interface goes here
    var module = {};

    var gl;

    var fps = 40.0;
    var camera;
    var modelView = mat4.create();	//identity matrix, models centered at (0, 0, 0)
    var mesh;

    var renderFunctor = function() {};	//do nothing initially

    var wireframeProgram;	//the wireframe shader program
    var illuminationProgram;//the illumination shader program
    var colorProgram;		//the surface curvature shader program
    var currentProgram;

    var timer;

    var mouse = { prevX: 0, prevY: 0,
        dx: 0, dy: 0 };

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

        //Event handlers for input
        canvas.onmousedown = onMouseDown;
        canvas.onmouseup = onMouseUp;
        canvas.oncontextmenu = function( e ) { e.preventDefault(); };
        //add mouse wheel listener to the page (not the canvas!)
        //some compatibility cruft
        var mousewheelEvent = (/FireFox/i.test(navigator.userAgent))?"DOMMouseScroll" : "mousewheel";
        if ( document.attachEvent ) {	//if IE
            document.attachEvent( "on"+mousewheelEvent, onMouseWheel );
        } else if ( document.addEventListener ) {	//WC3 browsers
            document.addEventListener( mousewheelEvent, onMouseWheel, false );
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
        camera = new tools.Camera( Math.PI * 67.0 / 180.0, aspectRatio, 0.01, 1000.0 );

        initShaders();
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
    }

    function onMouseWheel( e ) {
        var event = window.event || e;
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
        /*Update mouse coordinates so that we don't create
         * a huge delta in the opposite direction*/
        mouse.prevX = event.pageX;
        mouse.prevY = event.pageY;
        switch ( event.which ) {
            case 1:
                canvas.onmousemove = function( e ) {
                    onMouseMove( e );
                    camera.orbit( mouse.dx * 0.004, mouse.dy * 0.004 );
                };
                break;
            case 3:
                canvas.onmousemove = function( e ) {
                    onMouseMove( e );
                    camera.pan( mouse.dx * -0.01, mouse.dy * 0.01 );
                };
                break;
        }
    }

    function onMouseUp( event ) {
        canvas.onmousemove = function( e ) {return false;};
    }

    function onMouseMove( event ) {
        var x = event.pageX;
        var y = event.pageY;
        mouse.dx = x - mouse.prevX;
        mouse.dy = y - mouse.prevY;
        mouse.prevX = x;
        mouse.prevY = y;
    }

    function drawScene() {
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

        var endTime = new Date();
        var deltaTime = endTime - timer;
        deltaTime /= 1000.0;

        camera.update( deltaTime );

        renderFunctor();

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
            mesh = new tools.Mesh( gl );

            var onload = function( model ) {
                tools.centerPointCloud( model.vertices.v );
                var verts = tools.unwrapArray( model.vertices.v, model.vertices.i );
                var norms;
                if ( model.normals.v.length == 0 ) {
                    norms = tools.vertexNormals( model.vertices.v, model.vertices.i );
                    norms = tools.unwrapArray( norms, model.vertices.i );
                } else {
                    norms = tools.unwrapArray( model.normals.v, model.normals.i );
                }

                var curvature = tools.surfaceVariation( verts, norms );
                var orientation = tools.surfaceOrientation( norms );

                mesh.meshFromArray( verts, norms, curvature, orientation );
                module.viewIlluminated();
                var aabb = tools.getAabb( model.vertices.v );
                camera.setBestPositionForModel( aabb );
            }

            tools.vertexArrayFromOBJ( file, onload );

        } else if ( type == "point cloud" ) {
            mesh = new tools.Mesh( gl );
            var onload = function( points ) {
                tools.centerPointCloud( points );
                var tris = tools.triangulate( points );

                var verts = tools.unwrapArray( points, tris );
                var norms = tools.vertexNormals( points, tris );
                norms = tools.unwrapArray( norms, tris );
                var curvature = tools.surfaceVariation( verts, norms );
                var orientation = tools.surfaceOrientation( norms );

                //mesh = new tools.Mesh( gl );
                mesh.meshFromArray( verts, norms, curvature, orientation );
                module.viewIlluminated();
                var aabb = tools.getAabb( points );
                camera.setBestPositionForModel( aabb );
            };

            tools.vertexArrayFromPointCloud( file, onload );

        }  else if ( type == "morphobuffer" ) {
            mesh = new tools.Mesh( gl );
            var onload = function( model ) {
                var verts = tools.unwrapArray( model.vertices.v, model.vertices.i );
                mesh.meshFromArray( verts, model.normals, model.curvature, model.orientation );
                module.viewIlluminated();
                var aabb = tools.getAabb( module.vertices.v );
                camera.setBestPositionForModel( aabb );
            };
            tools.vertexArrayFromMorphobuffer( file, onload );

        } else {
            throw "morphoviewer.view: unrecognized 3d file type";
        }
    };

    /**
     * View the object as a wire frame model.
     * */
    module.viewWireframe = function() {
        currentProgram = wireframeProgram;
        currentProgram.use();
        mesh.bind();
        tools.wireframe.enableAttributes( gl, currentProgram );
        tools.wireframe.setAttributes( gl, currentProgram, mesh.vertices() );
        mesh.unbind();

        renderFunctor = function() {
            mesh.bind();
            tools.wireframe.camera = camera.matrix();
            tools.wireframe.model = modelView;
            tools.wireframe.setUniforms( currentProgram );
            gl.drawArrays( gl.TRIANGLES, 0, mesh.vertices() );
            mesh.unbind();
        };
    };

    /**
     * Color the surface of the object according to the discreet orientation of each polygon.
     * */
    module.viewSurfaceOrientation = function() {
        if ( currentProgram.object != colorProgram.object ) {
            currentProgram = colorProgram;
            currentProgram.use();
            setupColorShader();
        }
        tools.color.colorMode = 2;
    };

    /**
     * Color the surface of the object according to its local surface curvature.
     * */
    module.viewSurfaceCurvature = function() {
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
        tools.color.setAttributes( gl, currentProgram, mesh.vertices() );
        mesh.unbind();

        renderFunctor = function() {
            mesh.bind();
            tools.color.camera = camera.matrix();
            tools.color.model = modelView;
            tools.color.setUniforms( currentProgram );
            gl.drawArrays( gl.TRIANGLES, 0, mesh.vertices() );
            mesh.unbind();
        }
    }

    module.viewIlluminated = function() {
        currentProgram = illuminationProgram;
        currentProgram.use();

        mesh.bind();
        tools.directional.enableAttributes( gl, currentProgram );
        tools.directional.setAttributes( gl, currentProgram, mesh.vertices() );
        mesh.unbind();

        renderFunctor = function() {
            mesh.bind();
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
        camera.positionLeft();
    };

    module.viewRight = function() {
        camera.positionRight();
    };

    module.viewTop = function() {
        camera.positionTop();
    };

    module.viewBottom = function() {
        camera.positionBottom();
    };

    module.viewFront = function() {
        camera.positionFront();
    };

    module.viewBack = function() {
        camera.positionBack();
    };

    module.color = {
        black: vec3.fromValues(0.0, 0.0, 0.0),
        white: vec3.fromValues(1.0, 1.0, 1.0),
        lightgray: vec3.fromValues(0.91, 0.91, 0.91),
        lightgrey: vec3.fromValues(0.91, 0.91, 0.91),
        darkgray: vec3.fromValues(0.41, 0.41, 0.41),
        darkgrey: vec3.fromValues(0.41, 0.41, 0.41)
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

    return module;
}( morphoviewer ));


