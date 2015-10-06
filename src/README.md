# How the source is organized

This document will explain what each file contains, and how some of the data structures work. 

The code is commented, so you can also learn by opening up `morphoviewer.js` and looking at the contents of `module.Viewer`. The beginning of the file contains a number of global variables and functions. Their purpose is contained in the comments above the variables. Find the function call for `setInterval` to see what what makes the code tick.

The project uses a namespace structure. Each module is contained in one file. Each module is implemented as a function, which takes in an object passed as an argument, and appends the functions it wants to export to the object.

There are four modules:
* File parsing is contained in `file_io.js`. It depends on the `jdataview.min.js` library.
* Data structures and functions for processing geometry are contained in `geometry.js`. It has no dependencies.
* Data structures for WebGL are contained in `graphics.js`. The file depends on the `gl-matrix-min.js` library. Some of the functionality includes:
  * functions for creating a WebGL shader program from shader source contained in a string
  * A prototype wrapper for a shader program object
  * A prototype wrapper for a vertex buffer object
  * A prototype wrapper for a 3d mesh object
  * A prototype camera class
  * Objects containing the source of a shader, as well as utility functions for setting attributes for that particular shader
* Functions for processing the mesh are in `mesh_tools.js`. It depends on the `delaunay.min.js` library. Some of the functionality includes:
  * calculating the center of colume of a mesh
  * functions for *unwrapping* vertex data stored as indices into a vertex array
  * functions for calculating the bounding box of a mesh
  * a function for triangulating a mesh, containing 2.5D vertex data
  * functions for calculating the per-face and per-vertex normals
  * functions for calculating the surface orientation, surface curvature and the orientation patch count of a mesh
* A data structure representing the tracking ball is contained in `trackball.js`. It depends on `graphics.js`
* Finally, the actual visible API is generated in `morphoviewer.js`. It depends on all the previous modules.

## `morphoviewer.js`

## `file_io.js`

This file contains functions for reading a number of different file formats.

## `geometry.js`

## `graphics.js`

## `mesh_tools.js`

## `trackball.js`

