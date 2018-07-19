const imgToTensor = (img) => {
  // output [224, 224, 3]
  let imgTensor = tf.fromPixels(img); 

  // output [1, 224, 224, 3]
  imgTensor = imgTensor.expandDims();
  
  // return normalized image tensor
  return imgTensor.toFloat().div(tf.scalar(255/2)).sub(tf.scalar(1))
}

export default imgToTensor;
