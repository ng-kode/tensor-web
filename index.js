import {
	WebCam
} from "./webcam";
import * as tf from '@tensorflow/tfjs';
import {
	setInterval,
	clearInterval
} from "timers";
import {
	Storage
} from "./storage";

window.tf = tf;

const MOBILENET_PATH = 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json'
let mobilenet;
let mobilenetReady = false;

const captureBtns = document.getElementsByClassName('captureBtn')
let touchInterval;
let capturing = false;

const numClasses = 3;
const storage = new Storage(numClasses);

let training = false;
const trainBtn = document.getElementById('trainBtn');

let vanilla;

// setup webcam
console.log('setting webcam...')
const webcam = new WebCam(document.getElementById('webcam'))
webcam.setUp()

// crop mobilenet
console.log('loading mobilenet...')
tf.loadModel(MOBILENET_PATH).then(model => {
	const cutLayer = model.getLayer('conv_pw_13_relu');
	mobilenet = tf.model({
		inputs: model.inputs,
		outputs: cutLayer.output
	})
	mobilenet.predict(webcam.capture()).print();

	mobilenetReady = true;
	console.log('mobilenet ready')
})

// buttons' listners
function autoCapture(idx) {
	if (capturing) {
		console.log('webcam in use')
		return;
	}
	if (!mobilenetReady) {
		console.log('mobilenet not ready')
		return;
	}

	// auto-capture
	if (idx !== 0 && !idx) {
		console.warn('idx not found');
		return;
	}
	console.log(`capturing ${idx}`)
	capturing = true;
	trainBtn.disabled = true;

	let shotCount = 0
	touchInterval = setInterval(async () => {
		const feature = tf.tidy(() => mobilenet.predict(webcam.capture()));
		const label = tf.tidy(() => tf.oneHot(tf.tensor1d([idx]).toInt(), numClasses));

		storage.store(feature, label);

		console.log(storage.labelCount())
		shotCount += 1

		// stop after 35 shots
		if (shotCount === 35) {
			clearInterval(touchInterval);
			capturing = false;

			console.log(`capturing ${idx} end`);
			trainBtn.disabled = false;
		}

		// wait for capture and storage to complete before next capture
		await tf.nextFrame();
	}, 100)
}
Array.from(captureBtns, captureBtn => {
	const idx = parseInt(captureBtn.dataset.idx)

	captureBtn.addEventListener('touchstart', () => autoCapture(idx), false)
	captureBtn.addEventListener('click', () => autoCapture(idx), false)
})
	
// train
function build_model() {
	const model = tf.sequential()

	model.add(tf.layers.flatten({
		inputShape: [7, 7, 256]
	}))
	model.add(tf.layers.dense({
		units: 256,
		activation: 'relu',
		kernelInitializer: 'leCunNormal'
	}))
	model.add(tf.layers.dropout({
		rate: 0.2
	}))
	model.add(tf.layers.dense({
		units: numClasses,
		activation: 'softmax'
	}))

	model.compile({
		optimizer: tf.train.rmsprop(0.00002),
		loss: 'categoricalCrossentropy'
	})

	return model
}

async function train() {
	storage.shuffleSamples();

	const validationSplit = 0.2
	storage.train_test_split(validationSplit)

	// const { train, test } = storage.train_test_split(validationSplit)
	// window.train = train
	// window.test = test
	// return

	const batchSize = 2
	const numBatches = Math.ceil(storage.getTrainCount() * (1-validationSplit) / batchSize)

	vanilla = build_model()
	const numEpochs = 5
	for (let j = 0; j < numEpochs; j++) {	
		// renew the generator for every epoch	
		console.log(`Start epoch ${j+1} / ${numEpochs}`);
		const gen = storage.nextTrainBatch();

		// loop through our samples
		for (let i = 0; i < numBatches; i++) {
			let {x, y} = gen.next().value
			x = tf.concat(x)
			y = tf.concat(y)
	
			const history = await vanilla.fit(
				x, y, {
					batchSize,
					epochs: 1
				}
			)
	
			x.dispose()
			y.dispose()

			const loss = history.history.loss;
			console.log(`Progress ${(i / numBatches * 100).toFixed(2)}%, loss ${parseFloat(loss).toFixed(5)}`)
		}

		console.log(`End epoch ${j+1} / ${numEpochs}`)
	}
	
}
trainBtn.addEventListener('touchstart', () => train(), false)
trainBtn.addEventListener('click', () => train(), false)