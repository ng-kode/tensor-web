import * as tf from '@tensorflow/tfjs';

function doubleShuffle(arr1, arr2) {
  var index = arr1.length;
  var rnd, tmp1, tmp2;

  while (index) {
    rnd = Math.floor(Math.random() * index);
    index -= 1;
    tmp1 = arr1[index];
    tmp2 = arr2[index];
    arr1[index] = arr1[rnd];
    arr2[index] = arr2[rnd];
    arr1[rnd] = tmp1;
    arr2[rnd] = tmp2;
  }

  return [arr1, arr2]
}

export class Storage {
	constructor(numClasses) {
		this.numClasses = numClasses;
	}

	store(feature, label) {	
		if (this.features == null) {
			this.features = []
			this.labels = []
			
			this.features.push(feature)
			this.labels.push(label)
		} else {
			this.features.push(feature)
			this.labels.push(label)
		}
	}

	getLabels() {
		const labels = []

		for (let i = 0; i < this.labels.length; i++) {
			const oneHot = this.labels[i];
			const idx = tf.argMax(oneHot, 1).dataSync()[0]
			labels.push(idx)
		}

		return labels;
	}

	labelCount() {
		const labels = this.getLabels()	
		let countDict = {}
		const keys = [...new Set(labels)]
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			countDict[key] = labels.filter(label => label === key).length
		}
		return countDict
	}

	shuffleSamples() {
		[this.features, this.labels] = doubleShuffle(this.features, this.labels)
	}

	train_test_split(test_ratio) {
		const train_samples = parseInt(this.features.length * (1-test_ratio))
		
		this.train = {}
		this.test = {}

		this.train.x = this.features.slice(0, train_samples)		
		this.train.y = this.labels.slice(0, train_samples)

		this.test.x = this.features.slice(train_samples)
		this.test.y = this.labels.slice(train_samples)

		// return { train: this.train, test: this.test }
	}

	getTrainCount() {
		return this.train.y.length
	}

	getTestAll() {
		return this.test
	}

	* nextTrainBatch(b=2) {
		var idx=0;
		while(true) {
			var x=this.train.x.slice(idx, idx+b);
			var y=this.train.y.slice(idx, idx+b);
			idx+=b;
			yield { x, y };
		}
	}
}