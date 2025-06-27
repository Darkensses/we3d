# Contributing to the TMD Viewer/Editor
First off, thank you for your interest in this project! It's awesome that you're thinking about contributing. This started as a personal deep-dive into legacy 3D formats and browser-based graphics, and we are excited by the idea of others finding it useful and wanting to build upon it.

This document provides some guidelines for contributing and, just as importantly, sets some expectations regarding the project's maintenance.

## How to Contribute
The contribution workflow is the standard process you're likely familiar with from other projects on GitHub:

**Fork the repository** to your own GitHub account.

**Create a new branch** for your feature or bugfix. Please give it a descriptive name (e.g., `feature/texture-support` or `bugfix/camera-zoom-issue`).
```bash
git checkout -b feature/my-cool-new-feature
```
**Make your changes**. Write clean, commented code that follows the existing style of the project (see below).

**Test your changes** to ensure they work as expected and don't introduce any new issues.

**Submit a Pull Request (PR)** from your feature branch to the `master` branch of the original repository. In your PR description, please be clear about what problem you're solving or what feature you're adding.

## Areas for Contribution
There are many ways this tool could be extended! If you're looking for ideas, here are some of the features I've thought about that would be fantastic additions:

* **Texture Support**: Extend the `TMDParser` to extract texture information (TIM references) and apply those textures to the models in Three.js.

* **Advanced Editing Tools**:

  * Implement multi-vertex selection (e.g., box select).

  * Add tools to scale, rotate, or translate selections of vertices.

  * Face or edge selection modes.

* **Improved UI/UX**:

  * Displaying model hierarchy or metadata from the file.

  * Adding a proper grid or ground plane to the scene.

  * Exporting to Other Formats: Add the ability to export the edited models to more common formats like .obj or .gltf.

* **Bug Fixes & Refactoring**: If you spot a bug or an area of the code that could be cleaner or more performant, feel free to tackle it!

## A Note on Maintenance & Pull Requests
This is a personal project that we're working on during our free time. We are thrilled to welcome contributions, but we also want to be transparent about our availability.

As busy authors, we cannot commit to providing timely responses to issues or pull requests. While we will do our best to review them when we can, there may be significant delays.

Furthermore, please understand that not all contributions will be accepted. The decision to merge a PR will be based on the project's direction and our own vision for it. While we appreciate every effort, we must reserve the right to decline contributions.

Our hope is that this tool can be a useful resource and a foundation for others to build upon. If you have a specific need, the best approach is often to fork the project and adapt it for your own purposes.

## Coding Style
Please try to follow the existing coding conventions and style you see in the codebase. The main goal is to keep the code readable and easy to understand for everyone. A few general points:

* Use clear, descriptive names for variables and functions.
* Comment on complex logic or anything that isn't immediately obvious.
* Stick to the ES6 module format already in use.

See also our [guidelines](GUIDELINES.md) document on how to get started.

## Final words
We know there are lot's of improvements to be made, but we were striving to have a functional tool as soon as possible to share with this vibrant gaming community. 

Thank you again for your interest and for considering a contribution!

Happy coding!