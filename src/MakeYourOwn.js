import React, { Component } from 'react';
import { Webcam } from "./Webcam.js";
import { Storage } from './Storage';
import './MakeYourOwn.css'
const tf = window.tf;

// other avaiable application-ready models: https://keras.io/applications/
const MOBILENET_PATH = 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json'
const isMobile = true

export class MakeYourOwn extends Component {
  constructor(props) {
    super(props);
    this.state = {
      camAbsent: false,
      labelCount: {},
      canPredict: false,
      predictions: [],
    }

    this.IMAGE_SIZE = 224;
    this.numClasses = 3;
    this.storage = new Storage(this.numClasses)

    this.handleCaptureStart = this.handleCaptureStart.bind(this)
    this.handleCaptureEnd = this.handleCaptureEnd.bind(this)
    this.handleTrainClick = this.handleTrainClick.bind(this)
    this.train = this.train.bind(this)
    this.build_model = this.build_model.bind(this)
    this.handlePredictClick = this.handlePredictClick.bind(this)
  }

  _webcam = webcam => {
    this.webcam = webcam
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

  handleCaptureStart(label) {
    this.interval = setInterval(() => {
      this.storage.store(
        this.mobilenet.predict(this.webcam.capture()),
        tf.oneHot(tf.tensor1d([label]).as1D().toInt(), this.numClasses)
      )
      const labelCount = this.storage.labelCount()
      console.log(labelCount);
      this.setState({ labelCount })
    })
  }

  handleCaptureEnd() {
    clearInterval(this.interval)
  }

  async handleTrainClick() {
    await this.train()
    const testset = this.storage.getTestAll();
    const result = this.vanilla.evaluate(tf.concat(testset.x), tf.concat(testset.y))
    result.print()
    this.setState({ canPredict: true })
  }

  async train() {
    console.log('start training')
  
    this.storage.shuffleSamples();
  
    const validationSplit = 0.2
    this.storage.train_test_split(validationSplit)
  
    const batchSize = 2;
    const numBatches = Math.ceil(this.storage.getTrainCount() * (1-validationSplit) / batchSize);
  
    this.vanilla = this.build_model()
    const numEpochs = 5;
    if (isMobile) {
        const train = this.storage.getTrainAll();
	await this.vanilla.fit(tf.concat(train.x), tf.concat(train.y))
    } else {
	    for (let j = 0; j < numEpochs; j++) {	
	      // renew the generator for every epoch	
	      console.log(`Start epoch ${j+1} / ${numEpochs}`);
	      const gen = this.storage.nextTrainBatch(batchSize);
	  
	      // loop through our samples
	      for (let i = 0; i < numBatches; i++) {
		let {x, y} = gen.next().value
		x = tf.concat(x)
		y = tf.concat(y)
	    
		const history = await this.vanilla.fit(
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
      optimizer: isMobile ? tf.train.sgd(0.001) : tf.train.rmsprop(0.00002),
      loss: 'categoricalCrossentropy'
    })

    return model
  }

  handlePredictClick() {
    this.webcam.watchOnDemand(async () => {
      const feature = this.mobilenet.predict(this.webcam.capture())
      this.vanilla.predict(feature).data().then(predictions => {
        console.log(predictions);
        this.setState({ predictions })        
      })
      
      await tf.nextFrame()
    }, window.location.pathname !== '/make-your-own')
  }

  componentDidMount() {
    this.loadMobilenet()
    window.tf = tf
  }

  render() {
    const {
      camAbsent,
      labelCount,
      canPredict,
      predictions
    } = this.state

    return (
      <div>
        {camAbsent ? 
          <p>We need a camera</p> 
        : <div className="container">
            <div className="row">
              <div className="col-4 embed-responsive embed-responsive-1by1">
                <Webcam
                ref={this._webcam}
                className="embed-responsive-item"
                setCamAbsent={() => this.setState({ camAbsent: true })}
                IMAGE_SIZE={this.IMAGE_SIZE}
                />
              </div>

              <div className="col-8 pt-5 pl-5">
                <h2>Train a model for face recognition</h2>
                <p className="mt-4 mb-1 step-subhead">Step 1: Collect samples.</p>
                <p>Take photos for 3 different faces</p>
                {['danger', 'warning', 'info'].map((color, i) => {
                  return <button
                  key={color}
                  onMouseDown={() => this.handleCaptureStart(i)}
                  onMouseUp={this.handleCaptureEnd}
		  onTouchStart={() => this.handleCaptureStart(i)}
                  onTouchEnd={this.handleCaptureEnd}
                  type="button" 
                  className={`btn btn-outline-${color} mr-2`}>Face {i+1}</button>
                })}

                {Object.keys(labelCount).length > 0 && <div className="mt-2">
                  {[0, 1, 2].map(i => <span key={i} className="mr-3">Face {i}: {labelCount[i]}</span>)}
                </div>}
                                
                {Object.keys(labelCount).length > 0 && <div>
                  <p className="mt-4 mb-1 step-subhead">Step 2: Train the model</p>
                  <button onClick={this.handleTrainClick} className="btn btn-outline-success btn-lg col-7">
                    Train
                  </button>
                </div>}

                {canPredict && <div>
                  <p className="mt-4 mb-1 step-subhead">Step 3: Predict !!</p>
                  <button onClick={this.handlePredictClick} className="btn btn-outline-success btn-lg col-7">
                    Start predict !
                  </button>
                </div>}

                {predictions.length > 0 && <div className="mt-4">
                  {['danger', 'warning', 'info'].map((color, i) => 
                    <div key={color} className="progress">
                      <div 
                      className={`progress-bar bg-${color}`} 
                      role="progressbar"
                      style={{ width: `${predictions[i] * 100}%` }}
                      aria-valuenow={`${predictions[i] * 100}`}
                      aria-valuemin="0"
                      aria-valuemax="100">
                        {parseFloat(predictions[i] * 100).toFixed(2)} %
                      </div>
                    </div>
                  )}
                </div>}
              </div>
            </div>            
          </div>
        }
      </div>
      
    )
  }
}

