#Morphoviewer.js
Render a 3d mesh in the browser and display various surface properties.

Morphoviewer.js provides facilites for loading .OBJ files, csv point clouds and a certain type of binary file (a
morphobuffer file) and rendering them using WebGL. In order to render a point cloud, the points need to be triangulated,
which is something that morphoviewer.js does for you automatically, using a Delaunay triangulation algorithm.

Using morphoviewer.js is simple. The library specifies the morphoviewer namespace, which contains methods for viewing
different kinds of files, and controlling the type of shading, view, type of projection, etc.

##Loading a file
To load a file, simply do `morphoviewer.viewData( <name>, <type>)`, where <name> is the name of the file to be displayed,
and type is the type of the file. valid types are `"obj"` for displaying Wavefront .OBJ files, `"point cloud"` for
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
`morphoviewer.setLightPolarAngle( <value> )` where value is between 0 and PI, and
`morphoviewer.setLightAzimuthalAngle( <value> )` where value is between 0 and 2*PI



