# WE3D
This is a tool that helps to the patchers to visualize some 3D models that the Winning Eleven' ROM has.

### Get Started
clone the repo, install the dependencies and run:
```bash
git clone https://github.com/Darkensses/we3d.git
cd we3d
npm install
npm run dev
```
---

### References
https://psx.arthus.net/sdk/Psy-Q/DOCS/Devrefs/Filefrmt.pdf
https://github.com/rickomax/psxprev/blob/no-deps/Common/Parsers/TMDParser.cs

---

### Coding Principles/Style

One of the goals of this project is to make the code as understandable as possible for anyone, but at the same time as clean and compact as possible.
<br>
So, before write any line of code, please keep in mind the [Rob Pike's 5 Rules of Programming]
(https://users.ece.utexas.edu/~adnan/pike.html)

> ..."Premature optimization is the root of all evil." ..."When in doubt, use brute force." ..."write stupid code that uses smart objects".

When you're ready to write your first lines of code, please try to follow as much as possible the [Mr.doob's Code Style™](https://github.com/mrdoob/three.js/wiki/mr.doob's-code-style%E2%84%A2).

---

### Philosophy

👉 Agnostic code is the best.

👉 All contributors and original authors must be acknowledged for their work.

👉 Avoid gatekeeping. Everyone should have equal access to knowledge and learning opportunities

👉 Patching/modding games is one of the best things that we can do to gain experiencie in almost anything.

👉 We don't know exactly what a developer is. [This word has become a meaningless](https://x.com/tsoding/status/1907252429759897746) nowadays. So, be yourself, have fun and if you want to be a dev, do it.


---


### Project Structure
- 📁 assets: contains files from the original ROM that help you out to test the tool.
  - 📄 `CGAF.BIN`: Model of a cup.
  - 📄 `GRDM_A.BIN`: Model of a stadium.
  - 📕 `Filefrmt_tmd.pdf`: PDF that contains only the oficial specifications for the TMD format.
  - 📄 `tmd.psx.pat`: Script for ImHex pattern.

- 📁 src/lib
  - 📄 `BinaryReader.js`: Class to read and move along all the bytes of the file. Inspired by [node-buffer-reader](https://github.com/villadora/node-buffer-reader/blob/master/index.js).
  - 📄 `TMDParser.v2.js`: Functions and algorithms for getting the models from the game's files.
  - 📄 `VertexInteractions.js`: Class that enables vertex interaction on the models. Communicate the logic between the models, ThreeJS and the user input (click, mouse).

- 📁 src
  - 📄 `main.js`: entry point for the app.
  - 📄 `model.bin.js`: WIP - PoC for the MODEL.BIN file.
  - 💄 `reset.css`: [Jake Lazaroff's CSS Reset](https://jakelazaroff.com/words/my-modern-css-reset/).
  - 💄 `style.css`: global styles.

- 🌱 root
  - 📜 `index.html`: html template for the app.
  - 📄 `bytes.js`: proto-test file. It verifies that the header of each packet configuration (see the PDF) are the expected ones.

### Drafted Roadmap

- Refactor and clean the code.
- Add tests for TMDParser.
- Add Transformation Controls.