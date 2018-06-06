import * as tf from '@tensorflow/tfjs';

export class Storage {
	constructor(numClasses) {
		this.numClasses = numClasses;
	}

	store(feature, raw_label) {
		const label = tf.tidy(() => 
			tf.oneHot(tf.tensor1d([raw_label]).toInt(), this.numClasses))

		if (this.features == null) {
			// first time storage
			this.features = tf.keep(feature)
			this.labels = tf.keep(label)
		} else {
			// concat to old storage, then dispose the old
			const oldFeatures = this.features;
			const oldLabels = this.labels;

			this.features = tf.keep(oldFeatures.concat(feature));
			this.labels = tf.keep(oldLabels.concat(label));

			oldFeatures.dispose();
			oldLabels.dispose();
			label.dispose()
		}
	}

	labelCount() {
		
	}
}