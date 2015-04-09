#Morphoviewer.js

![Alt text](https://rawgit.com/Nelarius/Morphoviewer/master/images/toothbanner.png "Akodon serrensis")

####Render a 3d mesh in the browser and display its surface properties.

Morphoviewer.js provides facilities for loading .OBJ files, csv point clouds and a certain type of binary file (a
morphobuffer file) and rendering them using WebGL. In order to render a point cloud, the points need to be triangulated,
which is something that morphoviewer.js does for you automatically, using a Delaunay triangulation algorithm.

Using morphoviewer.js is simple. The library specifies the morphoviewer namespace, which contains methods for viewing
different kinds of files, and controlling the type of shading, view, type of projection, etc.

An example of morphoviewer.js in use is [here](https://github.com/Nelarius/Nelarius.github.io/blob/master/index.html).

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
To load a file for viewing, simply do `morphoviewer.viewData( name, type)`, where `name` is the name of the file to be displayed,
and `type` is the type of the file. Valid types are `"obj"` for displaying Wavefront .OBJ files, `"point cloud"` for
displaying text csv point clouds, and `"ply"` for .PLY files (both ASCII and binary).

###Supported Wavefront object file (.OBJ) features
The library is capable of loading vertices (`v`), vertex normals (`vn`), and faces (`f`). Other types, such as texture
coordinates (`vt`) are ignored.

The library does NOT support defining faces with negative indices, or defining separate texture coordinate and normal
indices using the `/` notation.

The `moprhoviewer.io.loadOBJ(<file>, <onload>)` returns the following object: `{ "v": [], "f": [], "vn": []}`, where
each array contains a triplet of values.

###Supported Stanford polygonal file format (.PLY) features
The library can load both binary and Ascii PLY. The library loads the following common features:

`element vertex <element count>`

`property float x`

`property float y`

`property float z`

`property float nx`

`property float ny`

`property float nz`

`element face <element count>`

`property list uchar int vertex_indices`

The `morphoviewer.io.loadPLY(<file>, <onload>)` function returns an object, where each element is it's own named object, and each
property is an array, belonging to an element object. So the previous header would result in the following object: 
`{ "vertex": { "x": [], "y": [], "z": [], "nx": [], "ny": [] }, "face": { "vertex_indices": [] } }`.

###Text CSV format
`morphoviewer.io.loadCSV(<file>, <onload>, <delimiter>)` loads files containing `x`, `y`, and `z` coordinates separated
 by a delimiter. The `<delimiter>` parameter is set to `,` by default. The function returns an the following object:
 `{ "points": [] }`, where each array element is a triplet of values.

##Changing projection
Moprhoviewer.js renders using orthographic projection by default. To control the type of projection used, simply
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

