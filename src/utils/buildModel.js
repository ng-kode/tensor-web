const buildModel = (numClasses, tf) => {
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
    optimizer: tf.train.sgd(0.0001),
    loss: 'categoricalCrossentropy'
  })

  return model
}

export default buildModel;
