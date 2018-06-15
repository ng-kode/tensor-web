import React, { Component } from 'react';
import { Webcam } from "./Webcam.js";
import { Storage } from './Storage';
import './MakeYourOwn.css'
const tf = window.tf;

// other avaiable application-ready models: https://keras.io/applications/
const MOBILENET_PATH = 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json';
const isMobile = window.navigator.userAgent.toLowerCase().search(/mobile/) !== -1;

export class MakeYourOwn extends Component {
  constructor(props) {
    super(props);
    this.state = {
      camAbsent: false,
      labelCount: {},
      canPredict: false,
      predictions: [],
      step: 1,
      shotCount: 0,
      capturing: false,
      nextStep: false,
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
    this.setState({ capturing: true })
    this.interval = setInterval(() => {
      this.storage.store(
        this.mobilenet.predict(this.webcam.capture()),
        tf.oneHot(tf.tensor1d([label]).as1D().toInt(), this.numClasses)
      )
      const labelCount = this.storage.labelCount()
      console.log(labelCount);
      this.setState({ labelCount, shotCount: labelCount[label] })
    })
  }

  handleCaptureEnd() {
    this.setState({ capturing: false })
    clearInterval(this.interval)
    if (Object.keys(this.state.labelCount).length === this.numClasses) {
      this.setState({ nextStep: true })
    }
  }

  async handleTrainClick() {
    await this.train()
    const testset = this.storage.getTestAll();
    const result = this.vanilla.evaluate(tf.concat(testset.x), tf.concat(testset.y))
    result.print()
    this.setState({ canPredict: true })
  }

  async train() {
  
    this.storage.shuffleSamples();
  
    const validationSplit = 0.2
    this.storage.train_test_split(validationSplit)
  
    const batchSize = 2;
    const numBatches = Math.ceil(this.storage.getTrainCount() * (1-validationSplit) / batchSize);
  
    this.vanilla = this.build_model()
    const numEpochs = 5;
    console.log('start training')
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
      optimizer: isMobile ? tf.train.sgd(0.0001) : tf.train.rmsprop(0.00002),
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
      predictions,
      step,
      shotCount,
      capturing,
      nextStep
    } = this.state

    return (
      <div>
        {camAbsent ? 
          <p>We need a camera</p> 
        : 
        <div>
          {isMobile ?
            <div>
              <Webcam          
                ref={this._webcam}
                fullscreen
                IMAGE_SIZE={this.IMAGE_SIZE}
                showCanvas={capturing}
                setCamAbsent={() => this.setState({ camAbsent: true })} />
              <div id='videoContent'>
                {nextStep && !capturing && 
                  <button
                    onClick={() => this.setState({ step: this.state.step + 1, nextStep: false })}
                    id='goNextBtn' 
                    className="btn btn-outline-success btn-lg">
                    Next Step
                  </button>}
                {step === 1 && 
                  <div>
                    <span>Step 1: Take photos of 3 faces / objects</span> <br/>
                    <div className="d-flex justify-content-around mt-1">
                      {['danger', 'warning', 'info'].map((color, i) =>
                        <button
                          key={color}
                          className={`btn btn-outline-${color}`}
                          onTouchStart={() => this.handleCaptureStart(i)}
                          onTouchEnd={this.handleCaptureEnd}>
                          Face {i+1}
                          {labelCount[i] > 0 && <span class={`badge badge-pill badge-${color} ml-1`}>{labelCount[i]}</span>}
                        </button>
                      )}
                    </div>

                  {capturing &&<span id='shotCount'>{shotCount}</span>}
                </div> }                
              </div>
            </div>            
          :
            <div className="container">
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
                      <span key={color} className={`mr-3 text-${color}`}>
                        {parseFloat(predictions[i] * 100).toFixed(2)} %
                      </span>
                    )}
                  </div>}
                </div>
              </div>            
            </div>
          }
        </div>
        }
      </div>
      
    )
  }
}

