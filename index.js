import {
	WebCam
} from "./webcam";
import * as tf from '@tensorflow/tfjs';
import { setInterval, clearInterval } from "timers";
import { Storage } from "./storage";

const MOBILENET_PATH = 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json'
let mobilenet;
let mobilenetReady = false;

const captureBtns = document.getElementsByClassName('captureBtn')
let touchInterval;
let capturing = false;

const numClasses = 3;
const storage = new Storage(numClasses);

// setup webcam
console.log('setting webcam...')
const webcam = new WebCam(document.getElementById('webcam'))
webcam.setUp()

// crop mobilenet
console.log('loading mobilenet...')
tf.loadModel(MOBILENET_PATH).then(model => {
	const cutLayer = model.getLayer('conv_pw_13_relu');
	mobilenet = tf.model({ inputs: model.inputs, outputs: cutLayer.output })
	mobilenet.predict(webcam.capture()).print();

	mobilenetReady = true;
	console.log('mobilenet ready')
})

// buttons' listners
for (let i = 0; i < captureBtns.length; i++) {
	const captureBtn = captureBtns[i];
	const idx = parseInt(captureBtn.dataset.idx)

	captureBtn.addEventListener('touchstart', (e) => {
		if (capturing) {
			console.log('webcam in use')
			return;
		}
		if (!mobilenetReady) {
			console.log('mobilenet not ready')
			return;
		}

		// auto-capture
		capturing = true;
		touchInterval = setInterval(async () => {
			const feature = tf.tidy(() => mobilenet.predict(webcam.capture()));
			const label = tf.tidy(() => tf.oneHot(tf.tensor1d([idx]).toInt(), numClasses));

			storage.store(feature, label);

			// wait for capture and storage to complete before next capture
			await tf.nextFrame();
		}, 100)

		// stop after certain seconds
		setTimeout(() => {
			clearInterval(touchInterval);
			capturing = false;
		}, 3000)
	}, false)
}

