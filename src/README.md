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

This is module takes control over the user-defined canvas element (defined by html element id). It renders user-specified data in the canvas element and handles any user-input over the element.

Here are the following assumptions that are made in `morphoviewer.js`.
1. We render only one model at a time.
2. All models shall have the same data present after parsing.

These assumptions allow us to use a few different variables, defined at the top of the morphoviewer closure, to handle the rendering of the model.

### Rendering state of the model

The model state consits of many different variables. These are, more or less in order of appearance:

`mesh`, of type Mesh (see `graphics.js` for definition). A wrapper over the mesh object, which lives on hte GPU.

`meshCache`, an object which stores the mesh data in CPU memory. The data needs to be available, because when we recalculate the orientation data for a new orientation, we need immediate access to the normals. After this is done, we store the new array of scalar orientation values back in `meshCache`.

The `meshCache` fields have the following formats.
```js
{
    // stores an array of numbers, where group of three numbers represents one 3d vertex
    vertex: [],
    // stores an array of numbers, where every group of three numbers represents on normal vector
    normal: [], // stores an array 
    curvature: [],      // stores an array of numbers
    orientation: [],    //stores an array of numbers
    // stores an array of [ Number, Number, Number ], each representing one 3d vertex
    wrappedVertex: [],  
    // stores an array of [ Number, Number, Number ], each representing one normal vector
    wrappedNormal: [],
    // stores an array of arrays containing numbers. Each element array contains a list of indices.
    // the indices key into the unwrapped vertex array.
    adjacencyList: []
}
```

`modelView` is where we store the current world orientation of the model as a 4 x 4 matrix. Currently, the model can only be translated, while the camera orbits around the model. Thus the `modelView` matrix acts as a translation matrix.

`opcAreaLimit` and `totalModelArea` are used to control the threshold of the OPC count. The way it works is explained in greater detail in `algorithm.md`.

`renderFunctor` is a function object which is called in the `drawScene` function (the rendering loop). This function object is how morphoviewer swicthes between shading modes (wireframe, illuminated, colored by curvature, etc..). When a shading mode is switched, a new function specific to the shading mode is assigned to `renderFunctor`. The name `renderFunctor` is a C++:ism: it means a callable object.

`position` and `targetPosition` are used to store the current position of the model. The event handlers, such as handling click and drag of the left mouse button, will change `targetPosition`. The current `position` is linearly interpolated to `targetPosition` as a function of time, creating a smoother transition. In the `drawScene` function, `modelView` is updated to correspond to the translation to `position`.

### Event handling

Three types of events are captured over the canvas element. Mouse left-click, mouse right click, and mouse wheel scroll events. Note that opening the context menu (by right-clicking on a page) is disabled over the canvas element that `morphoviewer.js` controls. Mouse wheel movement is not captured outside of the canvas element.

The mouse movement delta (the change in mouse coordinates) are needed for camera movement. The current mouse coordinates, the previous frame's mouse coordinates, and the resulting movement deltas are stored in the `mouse` object.

## `file_io.js`

This file contains functions for reading a number of different file formats. In practise, PLY support is the most important, as it is the format that most of the 3d scans are going to be in.

The entry point for loading a PLY scan is `io.loadPLY`. It calls the function `parsePLY` which handles the parsing. It does so by parsing the PLY header, which returns PLY element (vertices and triangles are stored as elemnets) parser objects. The function then parses the data segment of the file, which may be ASCII or in binary. Note that binary PLY files can stored in little or big endian format.

`file_io.js` parsers Wavefront .OBJ, STL and point cloud files as well. OBJ and point clouds were used early on for testing purposes, but they're not very good for storing large 3d scans. Binary PLY is a much more compact file format than either one of those. STL files are used widely for 3d printing, but they don't store any triangulation information; the triangulation information would have to be recalculated on loading, and is probably too much for javascript to handle.

## `geometry.js`

## `graphics.js`

Defines a number of WebGL wrapper classes used by morphoviewer, as well as a few useful functions.

## `mesh_tools.js`

## `trackball.js`

