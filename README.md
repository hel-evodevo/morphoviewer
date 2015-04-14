#Morphoviewer.js

![Alt text](https://cdn.rawgit.com/Nelarius/Morphoviewer/master/images/toothbanner.png "Akodon serrensis")

##What is this?

This library is intended for viewing the geometry, wire frame, surface orientation, and surface curvature, of a
3d object, in a web browser. The code uses WebGL and HTML canvas elements to handle rendering.

An example of morphoviewer.js in use is [here](https://github.com/Nelarius/Nelarius.github.io/blob/master/index.html).

###How to use it

Just include the minified javascript source file from the `distribution/` folder in your project.

##The interface

`morphoviewer.js` defines the following classes & functions:

    morphoviewer.Viewer( canvasid )

    morphoviewer.Viewer.setBackgroundColor( array )

    morphoviewer.Viewer.view( url )
    morphoviewer.Viewer.viewdata( url, type )

    morphoviewer.Viewer.viewOrtho()
    morphoviewer.Viewer.viewPerspective()
    morphoviewer.Viewer.setFOV( value )

    morphoviewer.Viewer.viewHemispherical()
    morphoviewer.Viewer.viewWireframe()
    morphoviewer.Viewer.viewSurfaceCurvature()
    morphoviewer.Viewer.viewSurfaceOrientation()
    morphoviewer.Viewer.calculateOrientation()

    morphoviewer.Viewer.setLightPolarAngle( angle )
    morphoviewer.Viewer.setLightAzimuthalAngle( angle )

    morphoviewer.Viewer.showTrackingball()
    morphoviewer.Viewer.hideTrackingball()

    morphoviewer.Viewer.viewLeft()
    morphoviewer.Viewer.viewRight()
    morphoviewer.Viewer.viewTop()
    morphoviewer.Viewer.viewBottom()
    morphoviewer.Viewer.viewFront()
    morphoviewer.Viewer.viewBack()

    morphoviewer.io.loadFile( file, loadcallback )
    morphoviewer.io.loadPLY( file )
    morphoviewer.io.loadCSV( file )
    morphoviewer.io.loadSTL( file )
    morphoviewer.io.getFileType( filebuffer )

###`Viewer` class

After creating a canvas element in your HTML, use this class to populate the canvas. These tasks could be done
as follows:

    <canvas width="640" height="400" id="testcanvas">
      Your browser doesn't appear to support the HTML5 canvas element.
      Consider updating your browser!
    </canvas>
    <script>
      var viewer = new morphoviewer.Viewer("testcanvas");
      viewer.setBackgroundColor([0.854902,0.886275,0.901961]);
      viewer.view( "https://cdn.rawgit.com/Nelarius/Nelarius.github.io/master/obj/akodon.ply" );
    </script>

A new `Viewer` is created, and data is loaded by calling its `view` method. `Viewer.view` accepts PLY, STL, and CSV
files (containing xyz coordinates).

####Supported Stanford polygonal file format (.PLY) features

Both ASCII and binary PLY can be used. `morphoviewer.Viewer.view` looks for the following elements and properties:

    element vertex <element count>
    property float x
    property float y
    property float z
    property float nx
    property float ny
    property float nz
    property float orientation
    element face <element count>
    property list uchar int vertex_indices
    property float curvature

It is optional to include `nx`, `ny`, `nz`, `orientation`, and `curvature` in the PLY file.

The algorithms according to which the values of `orientation` and `curvature` are calculated are documented elsewhere.

####Supported STL file format features

Both ASCII and binary STL can be used.

####Text CSV format

`moprhoviewer.Viewer.view` can load text files containing `x`, `y`, and `z` coordinates separated by a comma.

##Camera controls
`morphoviewer.Viewer` captures all mouse controls over the canvas element. The controls
are: mouse wheel to zoom in and out, left button down + mouse move to rotate the camera, right mouse button down + 
mouse move to pan the camera.

##View in perspective or orthographic projection
Objets are rendered using orthographic projection by default. To control the type of projection used, simply
do `morphoviewer.Viewer.viewPerspective()` for rendering using perspective projection, or
`morphoviewer.Viewer.viewOrtho()` for rendering using orthographic projection. Use
`morphoviewer.Viewer.setFOV( value )` to control the vertical field of view when viewing objects in perspective
projection mode.

##Changing shading mode
The object's surface can be rendered using illumination, or a wire frame, or colored according to the curvature or
orientation. To do this, use on of the following four methods:

    morphoviewer.Viewer.viewHemispherical()
    morphoviewer.Viewer.viewWireframe()
    morphoviewer.Viewer.viewSurfaceCurvature()
    morphoviewer.Viewer.viewSurfaceOrientation()
    morphoviewer.Viewer.calculateOrientation()

The surface orientation depends on where the current camera is. The orientation is calculated about the current
camera forward normal. Therefore, `calculateOrientation()` needs to be called for the current camera orientation
before calling `viewSurfaceOrientation`. An example of use might the following button:

    <button onclick="viewer.calculateOrientation(); viewer.viewSurfaceOrientation();">orientation</button>

###Changing the lighting orientation
The object is illuminated by a hemisphere. The hemisphere's orientation can be changed by calling the following methods:
`morphoviewer.Viewer.setLightPolarAngle( value )` where `value` is between 0 and PI, and
`morphoviewer.Viewer.setLightAzimuthalAngle( value )` where `value` is between 0 and 2*PI

##Changing the camera angle
The following code will rotate the camera to a predefined view:

    morphoviewer.Viewer.viewLeft()
    morphoviewer.Viewer.viewRight()
    morphoviewer.Viewer.viewTop()
    morphoviewer.Viewer.viewBottom()
    morphoviewer.Viewer.viewFront()
    morphoviewer.Viewer.viewBack()

