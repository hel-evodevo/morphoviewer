#Morphoviewer.js

![Alt text](https://cdn.rawgit.com/Nelarius/Morphoviewer/master/images/toothbanner.png "Akodon serrensis")

## What is it?

This is a WebGL library, intended for rendering and conducting the surface analysis of a 3d object within the web browser.

An example of morphoviewer.js in use is [here](https://github.com/Nelarius/Nelarius.github.io/blob/master/index.html).

## License

## Usage

This section is a small tutorial on how to use the Morphoviewer library. For a full list of functions, see the bottom of this README.

#### Include

Just include the minified javascript source file from the `distribution` folder in your project.

#### Creating a `Viewer` instance and loading a file

We need to create an HTML canvas element, and then create an instance of `morphoviewer.Viewer` which will take over ownership of the canvas element. Let's start with a minimal example:

```html
<html>
<head>
  <meta charset="UTF-8">
</head>

<body>
  <script src="https://cdn.placeholder.com/morphoviewer.min.js"></script>
  <!-- We give the canvas an id string, which we use later -->
  <canvas width="640" height="400" id="testcanvas">
    Your browser doesn't appear to support the HTML5 canvas element.
    Consider updating your browser!
  </canvas>
  <script>
    // By default, the viewer will look for the id string "glcanvas"
    var viewer = new morphoviewer.Viewer("testcanvas");
    viewer.setBackgroundColor([0.854902,0.886275,0.901961]);
    viewer.view( "https://cdn.placeholder.com/3dmodel.ply" );
  </script>
</body>
</html>
```

In the script tag, we let the `viewer` instance take control of the `testcanvas` element, we set a background color, and then told the `viewer` instance to load a 3d model in the PLY format.

For the rest of this tutorial, I will use the `viewer` instance that we just created above.

#### Handling camera orientation

Note that the `viewer` instance captures mouse input over its owned canvas automatically. You can rotate the view by holding the left mouse button down, zoom in and out by rotating the scroll wheel, and translate the model by holding the right mouse button down. Note that the context menu (right click) is deactivated over the canvas element. Mouse input is not captured outside of the canvas element.

You can set the camera to six preset views programmatically by using the `viewer` instance:
```js
viewer.viewLeft();
viewer.viewRight();

viewer.viewFront();
viewer.viewBack();

viewer.viewBottom();
viewer.viewTop();
```

#### Controlling the perspective

The `Viewer` instance renders objects using orthographic projection by default. You can select orthographic or perspective projection by calling

```js
viewer.viewOrtho();	       // orthographic projection is now used
viewer.viewPerspective();  // perspective projection is now used
```

When rendering using perspective projection, hte vertical field-of-view (FOV) can be changed by calling `viewer.setFov( value )`, where value should be given in degrees. For instance, an input slider controlling the vertical FOV with reasonable inputs would be written like

```html
<input id="fov" type="range" min="0.1" max="100" step="0.1" value="67" oninput="viewer.setFOV(this.value)">
```

#### Controlling the shading

The 3d model is viewed with hemispherical lighting by default. The hemispherical light is situated on the surface of a sphere, and you can control it's orientation by changing the polar and azimuthal angles, via two function calls. Here's how you would create two input sliders to contorl the orientation:

```html
<input id="polar" type="range" min="0.1" max="3.14" step="0.1" value="1.57" oninput="viewer.setLightPolarAngle(this.value)">
<input id="azimuth" type="range" min="0.1" max="6.283" step="0.1" value="0" oninput="viewer.setLightAzimuthalAngle(this.value)">
```

There are other shading modes available as well. As an example, here's how you would create a set of buttons to change the shading mode.
```html
<button onclick="viewer.viewWireframe()">wireframe</button>
<button onclick="viewer.viewSurfaceCurvature();">curvature</button>
<button onclick="viewer.calculateOrientation(); viewer.viewSurfaceOrientation();">orientation</button>
<button onclick="viewer.viewHemispherical()">illumination</button>
```
Note that in order to view the orientation, we have to calculate it first. This is because the orientation is calculated on the plane, normal to the direction the camera is currently pointing in.

The surface curvature plots the amount of local curvature on the surface.

#### Show and hide the tracking ball

By default, the `viewer` instance displays a tracking ball around the 3d model. The tracking ball can be shown and hidden by calling `viewer.showTrackingball()` and `viewer.hideTrackingball()`, respectively. Here's how you could write a toggle button script.

```html
<script type="text/javascript">
  function toggle() {
    var element = document.getElementById("togglebutton");       
      if ( element.value == "hide" ) {
        element.value = "show";
        viewer.hideTrackingball();
      } else if ( element.value == "show") {
        element.value = "hide";
        viewer.showTrackingball();
      }
  }
</script>
<input type="button" value="hide" id="togglebutton" onclick="toggle();"></input>
```

#### Calculating the orientation patch count (OPC)

Morphoviewer can be used to calculate the OPC. It will be calculated based on the surface orientation data that was last obtained by calling `morphoviewer.Viewer.calculateOrientation`. The OPC is obtained by calling the `opc()` function  on the `viewer` instance. The function returns a number corresponding to the patch count.

Here's how you would implement a button and text area to display the OPC:
```html
<script>
    function opc() {
        var count = viewer.opc();
        document.getElementById("opc").innerHTML = "The OPC is " + count;
    }
</script>

<button onclick="opc()">calculate OPC</button>
<br/>
<em id="opc"></em>
```

Counting the patches has Nlog(N) time complexity, where N is the number of vertices.

Sometimes it's not desirable for all patches to be counted. A database may contain mesh models of many different resolutions, for example. You can set a lower limit, under which the patches will not be counted. The lower limit is the ratio of patch surface area to total model surface area. Here's how you would set the limit:

```html
<script>
    function limit( value ) {
		    viewer.setPatchCutoff( value );
		    document.getElementById("limit").innerHTML = value;
		}
</script>
<p>Set the lower limit of patch size to be taken into the orientation patch count. Values range from 0 to 3.</p>
<input id="area" type="range" min="0.0" max="3.0" step="0.02" value="0.1" oninput="limit(this.value)">
<br />
<em id="limit">area</em>
```

Good patch limit values are in the range 0..1 %.

## Orientation

`morphoviewer.Viewer.calculateOrientation()` calculates the orientation of each vertex. The orientation takes 8 discrete values, corresponding to the 8 cardinal directions. The orientation is always calculated in the plane perpendicular to the camera. In this way, the orientation of the surface can be calculated independently of the model orientation.

For any given mesh, some adjacent vertices will have the same orientation. These vertices form orientation patches. The number of such patches is contained in the OPC.

## Accepted file types

The 3d file formats that `moprhoviewer.Viewer.view()` accepts are PLY, STL and OBJ files.

#### PLY support

Both ASCII and binary PLY can be used. `morphoviewer.Viewer.view` looks for the following elements and properties:

```
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
```

It is optional to include `nx`, `ny`, `nz`, `orientation`, and `curvature` in the PLY file.

#### STL support

Both ASCII and binary STL can be used. Note, however, that when using STL file input, only the wireframe, and hemisphere illumination shading modes will work. None of the others shading modes will work, nor will the OPC function. This is due to a limitation in the STL file format.

#### OBJ file format

Faces should be specified as triangles. No material file support.

## The interface

```js
morphoviewer.Viewer( canvasid_string )

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

morphoviewer.Viewer.opc()

morphoviewer.io.loadFile( file, loadcallback )
morphoviewer.io.loadPLY( file )
morphoviewer.io.loadCSV( file )
morphoviewer.io.loadSTL( file )
morphoviewer.io.getFileType( filebuffer )
```
