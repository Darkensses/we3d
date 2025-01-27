import { Plane, Raycaster, Vector2, Vector3 } from "three";

/**
 * @author prisoner849
 *
 * Original source:
 * https://hofk.de/main/discourse.threejs/2018/Interaction%20with%20Points/Interaction%20with%20Points.html
 *
 * More info:
 * https://discourse.threejs.org/t/line-segment-coordinates/4358/3
 * https://hofk.de/main/discourse.threejs/2018/index2018.html
 */

export default class VertexInteraction {
	constructor(geometry, points, pointsThreshold=0.25, controls, camera, sizes) {
		// From the main scene
		this.geometry = geometry;
		this.points = points;
		this.controls = controls;
		this.camera = camera;
		this.sizes = sizes;

		// Variables needed for this utility
		this.raycaster = new Raycaster();
		this.raycaster.params.Points.threshold = pointsThreshold;
		this.mouse = new Vector2();
		this.intersects = null;
		this.plane = new Plane();
		this.planeNormal = new Vector3();
		this.currentIndex = null;
		this.planePoint = new Vector3();
		this.dragging = false;
	}

	mouseDown(event) {
		this.#setRayCaster(event);
		this.#getIndex();
		this.dragging = true;
	}

	mouseMove(event) {
		if(this.dragging && this.currentIndex !== null) {
			this.#setRayCaster(event);
			this.raycaster.ray.intersectPlane(this.plane, this.planePoint);
			this.geometry.attributes.position.setXYZ(
				this.currentIndex,
				this.planePoint.x,
				this.planePoint.y,
				this.planePoint.z
			);
			this.geometry.attributes.position.needsUpdate = true;

			// Recalculate the bounding sphere of the geometry after modifying the positions.
			// This is necessary because the raycaster uses the geometry's bounding limits
			// to detect intersections.
			// If we don't update these limits, the raycaster won't correctly detect
			// the points in their new positions.
			this.geometry.computeBoundingSphere();
		}
	}

	mouseUp(event) {
		this.dragging = false;
		this.currentIndex = null;
		this.#controlsEnabled(true);
	}

	#getIndex() {
		this.intersects = this.raycaster.intersectObject(this.points);
		if(this.intersects.length === 0) {
			this.currentIndex = null;
			return;
		}
		this.#controlsEnabled(false);
		this.currentIndex = this.intersects[0].index;
		this.#setPlane(this.intersects[0].point);
	}

	#setPlane(point) {
		this.planeNormal.subVectors(this.camera.position, point).normalize();
		this.plane.setFromNormalAndCoplanarPoint(this.planeNormal, point);
	}

	#setRayCaster(event) {
		this.#getMouse(event);
		this.raycaster.setFromCamera(this.mouse, this.camera);
	}

	#getMouse(event) {
		this.mouse.x = (event.clientX / this.sizes.width) * 2 - 1;
		this.mouse.y = -(event.clientY / this.sizes.height) * 2 + 1;
	}

	#controlsEnabled(state) {
		this.controls.enabled = state;
	}
}