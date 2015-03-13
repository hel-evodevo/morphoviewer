
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

    module.Viewer = function( id ) {

        var self = this;

        this.fps = 40.0;
        this.renderFunctor = function() {};

        //this is the model view matrix of the mesh.
        //the tracking ball stays centered at (0, 0, 0) at all times and thus
        //doesn't have it's own matrix
        this.modelView = mat4.create();	//identity matrix, models centered at (0, 0, 0)

        //position parameters of mesh
        //target position is for smooth motion interpolation
        this.position = vec3.fromValues( 0.0, 0.0, 0.0 );
        this.targetPosition = vec3.fromValues( 0.0, 0.0, 0.0 );

        //tracking ball
        this.showTrackball = true;

        /**
         * Variables for keeping track of the rendering time delta
         * */
        this.timer = null;
        this.endTime = null;

        /*
         * Cache the mesh data for modification and creating new mesh objects during runtime
         * This object has the same structure as the object that tools.Mesh.build( obj ) takes
         * as an argument.
         * */
        this.meshCache = { vertex: [], normal: [], curvature: [], orientation: [] };

        /*
         * This is for storing the mouse's current and previous coordinates. Used in tracking mouse
         * motion deltas.
         * */
        this.mouse = {
            x: 0, y:0,
            prevX: 0, prevY: 0,
            dx: 0, dy: 0 };

        this.leftMouseButtonDown = false;

        var glRes = initgl( id );
        this.gl = glRes[0];
        this.canvas = glRes[1];

        var onMouseMove = function( event ) {
            self.mouse.x = event.pageX;
            self.mouse.y = event.pageY;
            self.mouse.dx = self.mouse.x - self.mouse.prevX;
            self.mouse.dy = self.mouse.y - self.mouse.prevY;
            self.mouse.prevX = self.mouse.x;
            self.mouse.prevY = self.mouse.y;
        };

        //construct event listeners
        var onMouseWheel = function( e ) {
            var event = window.event || e;
            //prevent from scrolling the document
            event.preventDefault();
            event.stopImmediatePropagation();
            //handle dolly zoom
            var delta = event.detail ? event.detail * (-120) : event.wheelDelta;
            self.camera.dolly( delta * -0.0025 );
        };

        var onMouseDown = function( event ) {
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
            self.mouse.prevX = event.pageX;
            self.mouse.prevY = event.pageY;
            switch ( event.which ) {
                case 1:
                    self.leftMouseButtonDown = true;
                    self.canvas.onmousemove = function( e ) {
                        onMouseMove( e );
                        self.camera.orbit(
                            self.mouse.dx * 0.004,// * getTrackballDampeningFactor(),
                            self.mouse.dy * 0.004// * getTrackballDampeningFactor()
                        );
                    };
                    break;
                case 3:
                    self.canvas.onmousemove = function( e ) {
                        onMouseMove( e );
                        var up = vec3.scale(vec3.create(), self.camera.up(), -self.mouse.dy * self.camera.distanceFromOrigin() * 0.001 );
                        var right = vec3.scale( vec3.create(), self.camera.right(), self.mouse.dx * self.camera.distanceFromOrigin() * 0.001 );
                        vec3.add( self.targetPosition, self.targetPosition, up );
                        vec3.add( self.targetPosition, self.targetPosition, right );
                    };
                    break;
            }
        };

        var onMouseUp = function( event ) {
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
                    self.leftMouseButtonDown = false;
                    break;
                case 2:
                    //
                    break;
                case 3:
                    //
                    break;
            }
            self.canvas.onmousemove = function( e ) {return false;};
        };

        this.canvas.onmousedown = onMouseDown;
        this.canvas.onmouseup = onMouseUp;
        this.canvas.oncontextmenu = function( e ) { e.preventDefault(); };
        if ( this.canvas.addEventListener ) {
            //IE9, Chrome, Safari, Opera
            this.canvas.addEventListener( "mousewheel", onMouseWheel, false );
            //Firefox
            this.canvas.addEventListener( "DOMMouseScroll", onMouseWheel );
        } else {
            this.canvas.addEventListener( "onmousewheel", onMouseWheel );
        }

        //the morphoviewer has only one camera
        var aspectRatio = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera = new tools.Camera( Math.PI * 60.0 / 180.0, aspectRatio, 0.01, 1000.0 );

        //build an empty mesh so that we have a valid array buffer when the shaders initialize
        this.mesh = new tools.Mesh( this.gl );
        this.mesh.build( {vertex:[], normal:[], curvature:[], orientation:[]} );

        this.timer = new Date();

        //build the trackball before shaders are initialized
        this.trackball = new tools.Trackball( this.gl );

        //construct render command

        var drawScene = function() {
            self.gl.clear( self.gl.COLOR_BUFFER_BIT | self.gl.DEPTH_BUFFER_BIT );

            self.endTime = new Date();
            var deltaTime = self.endTime - self.timer;
            deltaTime /= 1000.0;

            //update mesh position
            self.position = lerp( self.position, self.targetPosition, 0.5 * (1.0 - deltaTime) );
            self.modelView = mat4.create();
            mat4.translate( self.modelView, self.modelView, self.position );

            self.camera.update( deltaTime );

            self.renderFunctor();

            if ( self.showTrackball ) {
                self.currentProgram.stopUsing();

                self.lineProgram.use();
                tools.lineShader.camera = self.camera.matrix();
                tools.lineShader.model = mat4.create();
                tools.lineShader.surfaceColor = vec3.fromValues( 0.7, 0.7, 0.7 );
                if ( self.leftMouseButtonDown ) {
                    //blue
                    tools.lineShader.surfaceColor = vec3.fromValues(0.38, 0.38, 1.0);
                    tools.lineShader.setUniforms( self.lineProgram);
                    self.trackball.drawXYCircle( self.lineProgram);
                    //green
                    tools.lineShader.surfaceColor = vec3.fromValues(0.38, 1.0, 0.38);
                    tools.lineShader.setUniforms( self.lineProgram );
                    self.trackball.drawXZCircle( self.lineProgram );
                    //red
                    tools.lineShader.surfaceColor = vec3.fromValues(1.0, 0.38, 0.38);
                    tools.lineShader.setUniforms( self.lineProgram );
                    self.trackball.drawYZCircle( self.lineProgram );
                } else {
                    tools.lineShader.setUniforms( self.lineProgram );
                    self.trackball.draw( self.lineProgram );
                }
                self.lineProgram.stopUsing();

                self.currentProgram.use();
            }

            self.timer = new Date();
        };

        setInterval(
            drawScene,
            1000.0 / this.fps,
            this.gl,
            this.renderFunctor,
            this.lineProgram,
            this.currentProgram,
            this.trackball,
            this.camera,
            this.timer
        );

        var progRes = initShaders( this.gl );
        this.wireframeProgram = progRes[0];
        this.colorProgram = progRes[1];
        this.illuminationProgram = progRes[2];
        this.lineProgram = progRes[4];
        this.hemisphereProgram = progRes[3];
        this.currentProgram = this.hemisphereProgram;

        this.viewHemispherical();
    };

    function initgl( canvasId ) {
        var cid;
        if ( canvasId == undefined ) {
            cid = "glcanvas";
        } else {
            cid = canvasId;
        }

        var canvas = document.getElementById( cid );

        var gl = initWebGL( canvas );

        //continue only if WebGL is available and working
        if ( gl ) {
            gl.clearColor( 0.10, 0.16, 0.16, 1.0 );
            gl.enable( gl.DEPTH_TEST );
            gl.depthFunc( gl.LEQUAL );
            gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
        } else {
            alert( "morphoviewer.initialize: Unable to initialize WebGL. Your browser may not support it." );
        }

        return [ gl, canvas ];
    }

    function initWebGL( canvas ) {
        var context = null;
        try {
            context = canvas.getContext( "webgl" ) || canvas.getContext( "experimental-webgl" );
        } catch( e ) {
            //
        }

        return context;
    }

    function initShaders( gl ) {
        var wireframeProgram = new tools.Program( gl );
        wireframeProgram.programFromString( tools.wireframe.vertex, tools.wireframe.fragment );

        var colorProgram = new tools.Program( gl );
        colorProgram.programFromString( tools.color.vertex, tools.color.fragment );

        var illuminationProgram = new tools.Program( gl );
        illuminationProgram.programFromString( tools.directional.vertex, tools.directional.fragment );

        var hemisphereProgram = new tools.Program( gl );
        hemisphereProgram.programFromString( tools.hemisphere.vertex, tools.hemisphere.fragment );

        var lineProgram = new tools.Program( gl );
        lineProgram.programFromString( tools.lineShader.vertex, tools.lineShader.fragment );
        tools.lineShader.enableAttributes( gl, lineProgram );
        tools.lineShader.setAttributes( gl, lineProgram );

        return [ wireframeProgram, colorProgram, illuminationProgram, hemisphereProgram, lineProgram ];
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

    /**
     * View a 3d file. The file can be a csv point cloud, or a .OBJ mesh file.
     *
     * @param {String} file The file URL
     * @param {String} type Can be either "obj" for .OBJ mesh file, or "point cloud" for csv point cloud.
     */
    module.Viewer.prototype.viewData = function( file, type ) {
        var self = this;
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
                self.meshCache = { vertex: [], normal: [], orientation: [], curvature: [] };
                self.meshCache.vertex = verts_unwrapped;
                self.meshCache.normal = norms_unwrapped;
                self.meshCache.curvature = curvature;
                self.meshCache.orientation = orientation;

                self.mesh = new tools.Mesh( self.gl );
                self.mesh.build({
                    vertex: verts_unwrapped,
                    normal: norms_unwrapped
                });
                var aabb = tools.getAabb( verts );
                self.trackball.setRadius( aabb.length / 2.3 );
                self.camera.setBestPositionForModel( aabb );
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
                self.meshCache = { vertex: [], normal: [], orientation: [], curvature: [] };
                self.meshCache.vertex = verts_unwrapped;
                self.meshCache.normal = norms_unwrapped;
                self.meshCache.orientation = orientation;
                self.meshCache.curvature = curvature;
                self.mesh = new tools.Mesh( self.gl );
                self.mesh.build( {
                    vertex: verts_unwrapped,
                    normal: norms_unwrapped,
                    curvature: curvature,
                    orientation: orientation
                } );
                var aabb = tools.getAabb( verts );
                self.trackball.setRadius( aabb.length / 2.3 );
                self.camera.setBestPositionForModel( aabb );
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
                self.meshCache = { vertex: [], normal: [], orientation: [], curvature: [] };
                self.meshCache.vertex = verts_unwrapped;
                self.meshCache.normal = norms_unwrapped;

                var meshObj = {
                    vertex: verts_unwrapped,
                    normal: norms_unwrapped
                };
                //if curvature & orientation were supplied, then add them to the object
                if ( vertex["orientation"] !== undefined ) {
                    meshObj.orientation = tools.unwrapArray( orientation, tris );
                    self.meshCache.orientation = meshObj.orientation;
                }
                if ( model["face"]["curvature"] !== undefined ) {
                    meshObj.curvature = curvature;
                    self.meshCache.curvature = curvature;
                }
                self.mesh = new tools.Mesh( self.gl );
                self.mesh.build( meshObj );
                var aabb = tools.getAabb( verts );
                self.trackball.setRadius( aabb.length / 2.3 );
                self.camera.setBestPositionForModel( aabb );
            } );

        } else {
            throw "morphoviewer.viewData: unrecognized 3d file type";
        }
    };

    /**
     * View the object as a wire frame model.
     * */
    module.Viewer.prototype.viewWireframe = function() {
        this.currentProgram = this.wireframeProgram;
        this.currentProgram.use();
        setWireFrame( this.mesh, this.gl, this.currentProgram );

        this.renderFunctor = function() {
            this.mesh.bind();
            tools.wireframe.setAttributes( this.gl, this.currentProgram, this.mesh.vertices() );
            tools.wireframe.camera = this.camera.matrix();
            tools.wireframe.model = this.modelView;
            tools.wireframe.setUniforms( this.currentProgram );
            this.gl.drawArrays( this.gl.TRIANGLES, 0, this.mesh.vertices() );
            this.mesh.unbind();
        };
    };

    function setWireFrame( mesh, gl, program ) {
        mesh.bind();
        tools.wireframe.enableAttributes(gl, program);
        tools.wireframe.setAttributes(gl, program, mesh.vertices());
        mesh.unbind();
    }

    /**
     * Color the surface of the object according to the discreet orientation of each polygon.
     *
     * If the currently active mesh doesn't have any orientation data, then this function doesn't do anything.
     * */
    module.Viewer.prototype.viewSurfaceOrientation = function() {
        //if the mesh doesn't have orientation data, then return immediately
        if ( !this.mesh.has( "orientation" ) ) {
            return;
        }
        if ( this.currentProgram.object != this.colorProgram.object ) {
            this.currentProgram = this.colorProgram;
            this.currentProgram.use();
            setupColorShader( this );
        }
        tools.color.colorMode = 2;
    };

    /**
     * Color the surface of the object according to its local surface curvature.
     *
     * If the currently active mesh doesn't have curvature data, then this function doesn't do anything.
     * */
    module.Viewer.prototype.viewSurfaceCurvature = function() {
        if ( !this.mesh.has( "curvature" ) ) {
            return;
        }
        if ( this.currentProgram.object != this.colorProgram.object ) {
            this.currentProgram = this.colorProgram;
            this.currentProgram.use();
            setupColorShader( this );
        }
        tools.color.colorMode = 1;
    };

    function setupColorShader( self ) {
        self.mesh.bind();
        tools.color.enableAttributes( self.gl, self.currentProgram );
        tools.color.setAttributes( self.gl, self.currentProgram, self.mesh.vertices(), self.mesh );
        self.mesh.unbind();

        self.renderFunctor = function() {
            self.mesh.bind();
            tools.color.setAttributes( self.gl, self.currentProgram, self.mesh.vertices(), self.mesh );
            tools.color.camera = self.camera.matrix();
            tools.color.model = self.modelView;
            tools.color.setUniforms( self.currentProgram );
            self.gl.drawArrays( self.gl.TRIANGLES, 0, self.mesh.vertices() );
            self.mesh.unbind();
        }
    }

    /**
     * Set the directional light shader as the active shader.
     * TODO: get rid of this lighting mode
     * */
    /*module.viewIlluminated = function() {
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

            this.gl.drawArrays( gl.TRIANGLES, 0, mesh.vertices() );
            mesh.unbind();
        }
    };*/

    /**
     * View the model under a hemispherical light source.
     * */
    module.Viewer.prototype.viewHemispherical = function() {
        this.currentProgram = this.hemisphereProgram;
        this.currentProgram.use();

        this.mesh.bind();
        tools.hemisphere.enableAttributes( this.gl, this.currentProgram );
        tools.hemisphere.setAttributes( this.gl, this.currentProgram, this.mesh.vertices() );
        this.mesh.unbind();

        var self = this;

        this.renderFunctor = function() {
            self.mesh.bind();
            tools.hemisphere.setAttributes( self.gl, self.currentProgram, self.mesh.vertices() );
            tools.hemisphere.camera = self.camera.matrix();
            tools.hemisphere.model = self.modelView;
            tools.hemisphere.setUniforms( this.currentProgram );

            self.gl.drawArrays( self.gl.TRIANGLES, 0, self.mesh.vertices() );
            self.mesh.unbind();
        }
    };

    /**
     * View with orthographic projection.
     */
    module.Viewer.prototype.viewOrtho = function() {
        this.camera.viewAsOrtho();
    };

    /**
     * View with perspective projection.
     */
    module.Viewer.prototype.viewPerspective = function() {
        this.camera.viewAsPerspective();
    };

    module.Viewer.prototype.viewLeft = function() {
        this.targetPosition = vec3.fromValues( 0.0, 0.0, 0.0 );
        this.camera.positionLeft();
    };

    module.Viewer.prototype.viewRight = function() {
        this.targetPosition = vec3.fromValues( 0.0, 0.0, 0.0 );
        this.camera.positionRight();
    };

    module.Viewer.prototype.viewTop = function() {
        this.targetPosition = vec3.fromValues( 0.0, 0.0, 0.0 );
        this.camera.positionTop();
    };

    module.Viewer.prototype.viewBottom = function() {
        this.targetPosition = vec3.fromValues( 0.0, 0.0, 0.0 );
        this.camera.positionBottom();
    };

    module.Viewer.prototype.viewFront = function() {
        this.targetPosition = vec3.fromValues( 0.0, 0.0, 0.0 );
        this.camera.positionFront();
    };

    module.Viewer.prototype.viewBack = function() {
        this.targetPosition = vec3.fromValues( 0.0, 0.0, 0.0 );
        this.camera.positionBack();
    };

    /**
     * Show the tracking ball (on by default).
     * */
    module.Viewer.prototype.showTrackingball = function() {
        this.showTrackball = true;
    };

    /**
     * Hide the tracking ball.
     * */
    module.Viewer.prototype.hideTrackingball = function() {
        this.showTrackball = false;
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
    module.Viewer.prototype.setBackgroundColor = function( color ) {
        this.gl.clearColor(
            color[0],
            color[1],
            color[2],
            1.0
        );
    };

    module.Viewer.prototype.setLightPolarAngle = function( theta ) {
        tools.hemisphere.polar = theta;
    };

    module.Viewer.prototype.setLightAzimuthalAngle = function( phi ) {
        tools.hemisphere.azimuth = phi;
    };

    module.Viewer.prototype.calculateOrientation = function() {
        this.meshCache.orientation = tools.surfaceOrientationAboutCamera( this.meshCache.normal, this.camera.rotation() );
        this.mesh = new tools.Mesh( this.gl );
        this.mesh.build( this.meshCache );
    };

    //re-export the io namespace
    module.io = {};
    module.io.loadPLY = tools.io.loadPLY;
    module.io.loadOBJ = tools.io.loadOBJ;
    module.io.loadCSV = tools.io.loadCSV;

    return module;
}( morphoviewer ));


