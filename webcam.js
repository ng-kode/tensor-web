import * as tf from '@tensorflow/tfjs';

export class WebCam {
	constructor(videoEl) {
		this.webcam = videoEl
		this.IMAGE_SIZE = 224
	}

	setUp() {
		navigator.getUserMedia = navigator.getUserMedia ||
			navigator.webkitGetUserMedia ||
			navigator.mozGetUserMedia ||
			navigator.msGetUserMedia ||
			navigator.oGetUserMedia;

		if(!navigator.getUserMedia) {
			console.log('getUserMedia absent')
			return
		}

		const options = { video: true }
    navigator.getUserMedia(options, (stream) => {
			this.webcam.srcObject = stream;
			this.webcam.width = this.IMAGE_SIZE;
			this.webcam.height = this.IMAGE_SIZE;
			console.log('webcam ready')
		}, (err) => console.warn(err));
	}

	capture() {
		return tf.tidy(() => {
			const img = tf.fromPixels(this.webcam); // [224, 224, 3]
			const batchedImg = img.expandDims(); // [1, 224, 224, 3]
			return batchedImg.toFloat().div(tf.scalar(255/2)).sub(tf.scalar(1))
		})
	}
}