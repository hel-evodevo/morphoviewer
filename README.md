#Morphoviewer.js
####Render a 3d mesh in the browser and display its surface properties.

Morphoviewer.js provides facilites for loading .OBJ files, csv point clouds and a certain type of binary file (a
morphobuffer file) and rendering them using WebGL. In order to render a point cloud, the points need to be triangulated,
which is something that morphoviewer.js does for you automatically, using a Delaunay triangulation algorithm.

Using morphoviewer.js is simple. The library specifies the morphoviewer namespace, which contains methods for viewing
different kinds of files, and controlling the type of shading, view, type of projection, etc.

An example of moprhobrowser.js in use is [here](https://github.com/Nelarius/Nelarius.github.io/blob/master/index.html).

##Camera controls
The library provides automatic camera controls for the WebGL canvas; no code is required to activate them. The controls
are: mouse wheel to zoom in and out, left button down + mouse move to rotate the camera, right mouse button down + 
mouse move to pan the camera.

##Initialize a WebGL canvas
Before this library's functions can be called, a WebGL canvas must be initialized. To do so, you can write 
`<canvas id="glcanvas" width="800" height="600"></canvas>` in your HTML document. Once a canvas exists, you 
call `morphoviewer.initialize( id )`, where `id` is the id of your canvas. By default, the canvas id `"glcanvas"` 
is searched for in the DOM.

##Loading a file
To load a file, simply do `morphoviewer.viewData( name, type)`, where `name` is the name of the file to be displayed,
and `type` is the type of the file. Valid types are `"obj"` for displaying Wavefront .OBJ files, `"point cloud"` for
displaying text csv point clouds, and `"morphobuffer"` for displaying binary morphobuffer files (more on this file type
later).

##Changing projection
Moprhoviewer.js renders using orthographics projection by default. To control the type of projection used, simply
do `morphoviewer.viewPerspective()` for rendering using perspective projection, or `morphoviewer.viewOrtho()` for
rendering using orthographic projection.

##Changing shading mode
Morphoviewer.js can render the surface as a wireframe, or illuminate the surface using directional lighting, or 
hemispherical lighting, or color the surface according to its curvature or orientation.

`morphoviewer.viewWireframe()` to view in wireframe.

`morphoviewer.viewSurfaceCurvature()` to color the surface accoring to the surface curvature for that polygon

`morphoviewer.viewOrientation()` to color the surface according to the surface normal's XY orientation

`morphoviewer.viewIlluminated()` renders the object using a directional light and phong shading

`morphoviewer.viewHemispherical()` renders the object using a hemispherical light

###Changing the hemisphere orientation
The illuminating hemisphere can be rotated by doing
`morphoviewer.setLightPolarAngle( value )` where `value` is between 0 and PI, and
`morphoviewer.setLightAzimuthalAngle( value )` where `value` is between 0 and 2*PI

##Changing the camera angle
The following code will rotate the camera to a predefined view: `morphoviewer.viewLeft()`, `morphoviewer.viewRight()`,
`morphoviewer.viewTop()`, `morphoviewer.viewBottom()`, `morphoviewer.viewFront()`, `morphoviewer.viewBack()`.

##The morphobuffer file format
The morphobuffer file format contains the vertex coordinates, the normals, the triangulation, the curvature, and the 
orientation values. Loading a morphobuffer file means that very little processing is done in the browser. The only 
processing done is unpacking the values from the file, which is far quicker than triangulating the point cloud in 
the browser.

The morphobuffer format is a binary file format which consists of a series of single byte identifiers, followed by 
bytes representing different values. The bytes are written as network-endian (big endian). 

###How the data is packed in the morphobuffer format
Each vertex is unique and must be listed as such in the file. In the mesh, however, neighboring triangles will share
vertices. The triangle is defined as three indices into the vertex list.

Per-vertex attributes (values unique to each vertex) are the vertex normals, and the orientation. These must be listed
in the same order as the vertices are specified in.

Per-face attributes are the surface curvature values. These must be listed in the same order as the triangles are
specified in.

###Byte fields in the morphobuffer format
Each byte field starts with a one byte identifier and is followed by a variable number of bytes. The byte fields are

Vertex: 1 byte char (`v`), followed by 3 * 8 bytes, where an 8 byte chunk is one floating point number.

Normal: 1 byte char (`n`), followed by 3 * 8 bytes, where an 8 byte chunk is one floating point number.

Triangle: 1 byte char (`t`), followed by 3 * 4 bytes, where each 4 byte chunk is one unsigned integer.

Curvature: 1 byte char (`c`) followed by 8 bytes representing one floating point number.

Orientation: 1 byte char (`o`) followed by 8 bytes representing one floating point number.
