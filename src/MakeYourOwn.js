import React, { Component } from 'react';
import * as tf from '@tensorflow/tfjs';
// import CLASS_NAME HERE
import './MakeYourOwn.css'

// other avaiable application-ready models: https://keras.io/applications/
const MOBILENET_PATH = 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json'
const IMAGE_SIZE = 224

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


export class MakeYourOwn extends Component {
  constructor(props) {
    super(props);
    this.state = {
      status_text: '',

      camReady: false,
      camAbsent: true,
      cams: null,
      deviceIdx: null,
      labelCount: {0: 0, 1:0, 2:0},

      mobilenetReady: false,

      capturing: false,
      training: false,

      canTrain: false,
      canPredict: false,

      predictions: [0.33, 0.33, 0.33],
      status_text: ''
    }

    this.numClasses = 3;
    this.handleVideo = this.handleVideo.bind(this)
    this.handleCaptureClick = this.handleCaptureClick.bind(this)
    this.handleTrainClick = this.handleTrainClick.bind(this)
    this.train_test_split = this.train_test_split.bind(this)
    this.handlePredictClick = this.handlePredictClick.bind(this)
  }

  _video = (video) => {
    this.video = video
  }
  
  _canvas = (canvas) => {
    this.canvas = canvas
  }
  
  loadMobilenet() {
    console.log('loading mobilenet...')
    this.setState({ status_text: 'loading mobilenet...' })
  
    tf.loadModel(MOBILENET_PATH).then(model => {
      const cutLayer = model.getLayer('conv_pw_13_relu');
      this.mobilenet = tf.model({
        inputs: model.inputs,
        outputs: cutLayer.output
      })
      this.mobilenet.predict(tf.zeros([1, 224, 224, 3])).data().then(values => console.log(values))
     
      console.log('mobilenet ready')
      this.setState({
        mobilenetReady: true,
        status_text: 'mobilenet ready !'
      })
    }) 
  }

  handleVideo(stream) {
    // stream video
    this.video.srcObject = stream;
    window.stream = stream;

    this.setState({ camReady: true })
  }

  handleVideoError(err) {
    console.warn(err)
  }

  setUpWebCam() {
    // get cam list
    navigator.mediaDevices.enumerateDevices()
      .then(dvs => {
        const cams = dvs.filter(d => d.kind === 'videoinput')
        if(cams.length === 0) {
          console.log('videoinput absent')
          return
        }
        // store list of cams to state
        this.setState({ cams })

         // get cam stream
        navigator.getUserMedia = navigator.getUserMedia || 
        navigator.webkitGetUserMedia || 
        navigator.mozGetUserMedia || 
        navigator.msGetUserMedia || 
        navigator.oGetUserMedia;

        if(!navigator.getUserMedia) {
            console.log('getUserMedia absent')
            return
        }

        const backCams = cams.filter(cam => cam.label.toLowerCase().search(/back/) !== -1)
        if (backCams.length === 0) {
          console.log('no backCams')
          this.setState({ deviceIdx: 0 })
          const options = { video: true }
          navigator.getUserMedia(options, this.handleVideo, this.handleVideoError);    
        } else {
          const deviceId = backCams[0].deviceId
          const deviceIdx = cams.map(cam => cam.deviceId).indexOf(deviceId)
          this.setState({ deviceIdx })
          const options = { video: { deviceId } }
          navigator.getUserMedia(options, this.handleVideo, this.handleVideoError);    
        }

        this.setState({ camAbsent: false })
        this.loadMobilenet()
      })
      .catch(err => console.warn(err))
  }

  capture() {
    return tf.tidy(() => {
      const ctx = this.canvas.getContext('2d')
      this.canvas.height = IMAGE_SIZE
      this.canvas.width = IMAGE_SIZE

      let sx, sy;
      sx = this.video.videoWidth/2 - IMAGE_SIZE/2
      sy = this.video.videoHeight/2 - IMAGE_SIZE/2
      
      ctx.drawImage(this.video, 
        sx, sy,
        IMAGE_SIZE, IMAGE_SIZE,
        0, 0, IMAGE_SIZE, IMAGE_SIZE)

      const img = tf.fromPixels(this.canvas); // [224, 224, 3]
      const batchedImg = img.expandDims(); // [1, 224, 224, 3]
      return batchedImg.toFloat().div(tf.scalar(255/2)).sub(tf.scalar(1))             
    })
  }

  predict() {
    console.log('predict')  
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

  handleCaptureClick(idx) {
    console.log('handleCaptureClick')
    console.log(idx)

    const {
      capturing,
      training,
      mobilenetReady
    } = this.state;

    if (capturing) {
      console.log('webcam in use')
      return;
    }
    if (training) {
      console.log('cannot capture when training')
      return;
    }
    if (!mobilenetReady) {
      console.log('mobilenet not ready')
      return;
    }        
    if (idx !== 0 && !idx) {
      console.warn('idx not found');
      return;
    }

    this.setState({ capturing: true })
    let shotCount = 0
    const maxShot = 35;
    
    this.touchInterval = setInterval(async () => {
      console.log(`Start capturing ${idx}`);

      const feature = tf.tidy(() => this.mobilenet.predict(this.capture()));
      const label = tf.tidy(() => tf.oneHot(tf.tensor1d([idx]).toInt(), this.numClasses));
  
      this.store(feature, label);
  
      const labelCount = this.labelCount()
      console.log(labelCount)
      this.setState({ labelCount })
      shotCount += 1
  
      // stop after 35 shots		
      if (shotCount === maxShot) {
        clearInterval(this.touchInterval);
        this.setState({ capturing: false, canTrain: true })
  
        console.log(`capturing ${idx} end`);
      }
  
      // wait for capture and storage to complete before next capture
      await tf.nextFrame();
    }, 100)
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

  build_model() {
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
      units: this.numClasses,
      activation: 'softmax'
    }))
  
    model.compile({      
      optimizer: tf.train.rmsprop(0.00002), 
      loss: 'categoricalCrossentropy'
    })
  
    return model
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

  async train() {      
    doubleShuffle(this.features, this.labels)
  
    const validationSplit = 0.2
    this.train_test_split(validationSplit)
  
    const batchSize = 2;
    const numBatches = Math.ceil(this.train.y.length * (1-validationSplit) / batchSize);
  
    this.ourModel = this.build_model()
    const numEpochs = 5;
    for (let j = 0; j < numEpochs; j++) {	
      // renew the generator for every epoch	
      console.log(`Start epoch ${j+1} / ${numEpochs}`);
      const gen = this.nextTrainBatch(batchSize);
  
      // loop through our samples
      for (let i = 0; i < numBatches; i++) {
        let {x, y} = gen.next().value
        x = tf.concat(x)
        y = tf.concat(y)
    
        const history = await this.ourModel.fit(
          x, y, {
            batchSize,
            epochs: 1
          }
        )
    
        x.dispose()
        y.dispose()
  
        const loss = history.history.loss;
        console.log(`Epoch ${j+1} / ${numEpochs}, Progress ${(i / numBatches * 100).toFixed(2)}%, loss ${parseFloat(loss).toFixed(5)}`)
      }
  
      console.log(`End epoch ${j+1} / ${numEpochs}`)
    }
  }

  handleTrainClick() {
    if (this.state.training) {
      console.log('model in train')
      return
    }
    this.setState({ training: true })

    setTimeout(async () => {
      await this.train()
      console.log('train complete !')
      this.setState({ training: false, canPredict: true })

      const result = this.ourModel.evaluate(tf.concat(this.test.x), tf.concat(this.test.y))
      result.print()
    }, 800)
  }

  handlePredictClick() {
    const feature = tf.tidy(() => this.mobilenet.predict(this.capture()));
	  this.ourModel.predict(feature).data().then(predictions => {
      console.log(predictions)
      this.setState({ predictions })
    })
  }

  componentDidMount() {
    this.setUpWebCam()

    setTimeout(() => {
      const $ = window.$;
      const $camcam = $('#camcam')
      console.log($camcam)
      const $oo = $('#oo')
      console.log($oo)
      $oo.css('height', IMAGE_SIZE)
      $oo.css('width', IMAGE_SIZE)
      $oo.css('top', `${$camcam.height()/2 - IMAGE_SIZE/2}px`)
      $oo.css('left', `${$camcam.width()/2 - IMAGE_SIZE/2}px`)

      $(window).resize(function () {
        const $camcam = $('#camcam')
        console.log($camcam)
        const $oo = $('#oo')
        console.log($oo)
        $oo.css('height', IMAGE_SIZE)
        $oo.css('width', IMAGE_SIZE)
        $oo.css('top', `${$camcam.height()/2 - IMAGE_SIZE/2}px`)
        $oo.css('left', `${$camcam.width()/2 - IMAGE_SIZE/2}px`)
      })

    }, 1000)

    window.tf = tf
  }

  render() {
    const {
      camAbsent,
      capturing,
      training,
      canTrain,
      canPredict,
      status_text,
      labelCount,
      predictions
    } = this.state

    return (
      <div className="mb-5">
        <div className="jumbotron makeyourown-jumbotron">
          <h1 className="display-4">Train a model</h1>
          <p className="lead">Right here in the browser (laptops only at the moment)</p>
          <span>How to use</span>
          <ol>
            <li>Take shots of 3 different faces (click the grey buttons 1 by 1)</li>
            <li>Train the model (click the yellow buttons)</li>
            <li>Predict (this will take a new shot, the model will guess which one it belongs)</li>
          </ol>

          <span>Have fun !</span>
        </div>

        <div className="container">
          {camAbsent ? <div>
            Oops...we need a camera
          </div> : <div className="row"> 

          <div className="col-5 col-xs-12 embed-responsive embed-responsive-1by1">
            <span className="embed-responsive-item">Things <b>inside</b> white box will be analzyed</span>
            <video id='camcam' autoPlay="true" ref={this._video} className="embed-responsive-item"></video>
            <div id='oo' className="embed-responsive-item"></div>
            <canvas style={{ display: 'none' }} ref={this._canvas} width={IMAGE_SIZE} height={IMAGE_SIZE}></canvas>
          </div>                    

          <div className="col-7 col-xs-12">
            <div className="mb-3">
              #Samples: <br/>
              Capture Face A: <span className="mr-3">{labelCount[0]}</span>
              Capture Face B: <span className="mr-3">{labelCount[1]}</span>
              Capture Face C: <span className="mr-3">{labelCount[2]}</span>
            </div>

            <div className="btn-group mb-3" role="group" aria-label="Basic example">
              <button onClick={() => this.handleCaptureClick(0)} type="button" className="captureBtn btn btn-secondary">Face A</button>
              <button onClick={() => this.handleCaptureClick(1)} type="button" className="captureBtn btn btn-secondary">Face B</button>
              <button onClick={() => this.handleCaptureClick(2)} type="button" className="captureBtn btn btn-secondary">Face C</button>
            </div>

            <div className="progress">
              <div className="progress-bar bg-info" role="progressbar" style={{width: `${predictions[0]*100}%`}} aria-valuenow={`${predictions[0]*100}`} aria-valuemin="0" aria-valuemax="100">
                {parseFloat(predictions[0]*100).toFixed(3)}%
              </div>
            </div>
            <div className="progress">
              <div className="progress-bar bg-warning" role="progressbar" style={{width: `${predictions[1]*100}%`}} aria-valuenow={`${predictions[1]*100}`} aria-valuemin="0" aria-valuemax="100">
              {parseFloat(predictions[1]*100).toFixed(3)}%
              </div>
            </div>
            <div className="progress">
              <div className="progress-bar bg-danger" role="progressbar" style={{width: `${predictions[2]*100}%`}} aria-valuenow={`${predictions[2]*100}`} aria-valuemin="0" aria-valuemax="100">
              {parseFloat(predictions[2]*100).toFixed(3)}%
              </div>
            </div>

            <div className="mt-3">
              <button onClick={this.handleTrainClick} id='trainBtn' disabled={!canTrain || capturing || training ? true : false} type="button" className="btn btn-warning">
                {training ? 'Training...(Press F12 to see progress)' : 'Train'}
              </button>
              <button onClick={this.handlePredictClick} id='predictBtn' disabled={!canPredict || capturing || training ? true : false} type="button" className="btn btn-success">Predict</button>
            </div>        
          </div>

          </div>}
        </div>
      </div>

    )
  }
}

