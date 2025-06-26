# Interactive TMD File Viewer and Vertex Editor

Hey everyone

We are excited to share a little project we've been tinkering with: an interactive web-based tool for viewing and editing 3D models stored in the **TMD format**. If you've ever delved into older PlayStation game assets, you might be familiar with TMD files. We wanted a way to not only visualize these models but also to directly manipulate their geometry in a straightforward manner.

This tool, built with **Three.js**, allows you to load a TMD binary file, see it rendered in a 3D space, and then (this is the cool part) you can interactively click and drag its vertices! Once you're done tweaking, you can download a new binary file with your modifications patched in.

It's been a fun exercise in understanding binary file structures, working with 3D graphics in the browser, and implementing direct manipulation for 3D geometry.

## Features

  * **Load TMD Files**: Use the file input to load your `.BIN` or other TMD-containing files.
  * **3D Visualization**: Renders models using Three.js, displaying them as wireframes along with visible vertices (points).
  * **Interactive Vertex Editing**:
      * Click and drag individual vertices of the model.
      * The underlying geometry is updated in real-time.
  * **Post-Processing**: Includes a subtle `UnrealBloomPass` for a nicer visual touch.
  * **Tweakpane UI**:
      * Toggle visibility for each loaded model.
      * "Focus" button to automatically adjust the camera to fit a selected model.
      * "Reset" button to revert any vertex modifications back to their original positions for a selected model.
  * **Download Patched TMD**: After editing vertices, you can download a new binary file with these changes applied. The tool intelligently patches only the vertex data within the original file structure.
  * **Camera Controls**: Smooth and intuitive camera manipulation (orbit, dolly, pan) powered by the `camera-controls` library.

## How It Works

1.  **File Loading & Parsing**:

      * When you select a file, the `FileReader` API reads it as an `ArrayBuffer`.
      * My custom `BinaryReader` class then provides a convenient way to navigate and read data from this buffer.
      * The `TMDParser.v2.js` (another custom library I wrote) takes this `BinaryReader` instance and parses the TMD structure, extracting vertex coordinates, vertex indices, and other relevant information. It can handle files containing multiple TMD objects.

2.  **Rendering with Three.js**:

      * For each TMD object parsed, a `THREE.BufferGeometry` is created.
      * Vertices are scaled (by `0.001`) and rotated (by `-Math.PI` around the X-axis) to fit a typical Three.js scene's coordinate system and scale. This is important because TMD coordinates are often integers in a different coordinate space.
      * Faces are constructed from the vertex indices provided in the TMD file. Since TMDs often define quads, these are split into two triangles for WebGL.
      * Two Three.js objects are created per TMD:
          * A `THREE.Mesh` with `MeshBasicMaterial` (wireframe) for the overall shape.
          * A `THREE.Points` object to visualize the individual vertices, making them easier to select.
      * The scene is rendered using `WebGLRenderer`, and `EffectComposer` with `RenderPass` and `UnrealBloomPass` handles the post-processing.

3.  **Vertex Interaction**:

      * The `VertexInteraction.js` class is the heart of the editing functionality.
      * It takes the Three.js `canvas`, `geometry`, `points` objects, camera, and viewport sizes as input.
      * On `mousedown`, it uses raycasting to determine if the mouse is over a vertex.
      * On `mousemove` (while a vertex is selected), it updates the vertex's position in the `BufferGeometry` based on mouse movement, projecting it onto a plane relative to the camera.
      * The `cameraControls` are temporarily disabled during a drag operation to prevent conflicts.

4.  **UI with Tweakpane**:

      * `Tweakpane` dynamically generates controls for each loaded model, allowing easy visibility toggling, focusing, and resetting.
      * The "Reset" functionality uses a backup of the original vertex positions stored when the model is first loaded.

5.  **Patching and Downloading**:

      * When you hit "Download," the current vertex positions are read from the `THREE.BufferAttribute`.
      * These positions are then transformed back: scaled by `1/0.001` (inverse of the loading scale) and rotated by `Math.PI` around the X-axis (inverse of the loading rotation) to match the original TMD coordinate system. The values are rounded to integers.
      * The `TMDParser.patchVertex()` method is then used. It takes the original binary data (`binfile_test`), the original parsed TMD structures (`tmds_test`), and the new vertex data (`patchedTMDs`). It carefully overwrites only the vertex data sections in the binary file, leaving headers and other parts untouched.
      * The resulting `ArrayBuffer` is then offered as a downloadable `.BIN` file.

## Getting Started

1.  **Clone the repository (if this were in one\!)**:
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```
2.  **Install dependencies**:
    This project uses ES6 modules and assumes you might be using a bundler like Vite or Parcel for development. If you have a `package.json`, you'd typically run:
    ```bash
    npm install
    ```
3.  **Run the development server using Vite**:
    ```bash
    npm run dev
    ```
    
4.  **Open in your browser**:
    Usually, it will be `http://localhost:5173` or a similar address.
5.  **Load a TMD file**: Click the "Choose File" button and select your binary file (there are two examples of bin files in the `assets` folder)
6.  **Interact**:
      * Use the mouse to drag vertices.
      * Use the Tweakpane controls on the right to manage models.

## Look and Feel
We wanted a "retro" look and decided on a VT100 green CLI sort of theme. But you can use your knowledge in tailwind to change it (perhaps you can share your themes with us too).

## Key Technologies Used

  * **Three.js**: For all things 3D rendering.
  * **Tweakpane**: For the lovely and simple UI controls.
  * **camera-controls**: For robust and flexible camera interactions.
  * **Custom Libraries**:
      * `TMDParser.v2.js`: My own parser for TMD file structures.
      * `BinaryReader.js`: A helper for reading binary data.
      * `VertexInteraction.js`: Handles the direct vertex manipulation logic.
  * **HTML5, CSS3, JavaScript (ES6 Modules)**

## Future Ideas

  * Support for visualizing textures if the TMD contains texture information (would require extending the parser and material setup).
  * More advanced editing tools (e.g., selecting multiple vertices, scaling/rotating selections).
  * Displaying model hierarchy or object names if present in the TMD metadata.
  * Saving to other common 3D formats.

It's been a really insightful project, and we hope it might be useful or interesting to others working with similar legacy 3D formats. There's still a lot of room for improvement, our goal was to have a functioning system and iterate but due to time constraints we cannot warranty timely updates or patches. If you want to contribute to this project see the [contribution](CONTRIBUTING.md) and [license](LICENSE.md) documents.

Cheers!