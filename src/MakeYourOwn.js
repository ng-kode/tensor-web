import React, { Component } from 'react';
import { Webcam } from "./Webcam.js";
import { Storage } from './Storage';
import './MakeYourOwn.css'
const tf = window.tf;

// other avaiable application-ready models: https://keras.io/applications/
const MOBILENET_PATH = 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json';

export class MakeYourOwn extends Component {
  constructor(props) {
    super(props);
    this.state = {
      camAbsent: false,
      mobilenetReady: false,
      labelCount: {},
      canPredict: false,
      predictions: [],
      step: 0,
      shotCount: 0,
      capturing: false,
      nextStep: false,
      statusText: ''
    }

    this.IMAGE_SIZE = 224;
    this.numClasses = 3;
    this.storage = new Storage(this.numClasses)

    this.handleCaptureStart = this.handleCaptureStart.bind(this)
    this.handleCaptureEnd = this.handleCaptureEnd.bind(this)
    this.handleTrainClick = this.handleTrainClick.bind(this)
    this.build_model = this.build_model.bind(this)
    this.handlePredictClick = this.handlePredictClick.bind(this)
    this.nextStepClick = this.nextStepClick.bind(this)
  }

  _webcam = webcam => {
    this.webcam = webcam
  }
  
  loadMobilenet() {
    console.log('loading mobilenet...')
    this.setState({ statusText: 'loading mobilenet...' })
  
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
        step: this.state.step + 1,
        statusText: ''
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

  nextStepClick() {
    if (this.state.step === 1) this.setState({ statusText: 'Start training' })
    this.setState({ step: this.state.step + 1, nextStep: false });

    setTimeout(() => {
      const {
        step
      } = this.state;
  
      switch (step) {
        case 2:
          this.handleTrainClick()
          break;
      
        case 3:
          this.setState({ capturing: true })
          this.handlePredictClick()
          break;
  
        default:
          break;
      }
    })    
  }

  async handleTrainClick() {
    this.storage.shuffleSamples();
  
    const validationSplit = 0.2
    const { train, test } = this.storage.train_test_split(validationSplit)
  
    const batchSize = 2;
    const numBatches = parseInt(train.x.length / batchSize)
  
    this.vanilla = this.build_model()
    const epochs = 5;

    console.log('start training')    
    let currEp = 1;
    await this.vanilla.fit(tf.concat(train.x), tf.concat(train.y), {
      batchSize,
      epochs,
      callbacks: {
        onBatchEnd: async (batch, logs) => {
          console.log(logs)
          this.setState({ 
            statusText: `(${parseInt(batch/numBatches * 100)} %)  Epoch: ${currEp} / ${epochs}, Training Loss: ${logs.loss.toFixed(5)}`
          })
          await tf.nextFrame();
        },
        onEpochEnd: async (epoch, logs) => {
          console.log(epoch)
          currEp += 1
          await tf.nextFrame();
        }
      }
    })

    this.setState({ statusText: 'Training completed. Now evaluating...' })
    const result = this.vanilla.evaluate(tf.concat(test.x), tf.concat(test.y))
    result.print()
    this.setState({ statusText: `Training completed, loss = ${result.dataSync()}` })
    this.setState({ canPredict: true, nextStep: true })
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
      optimizer: tf.train.sgd(0.0001),
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
      nextStep,
      statusText
    } = this.state

    return (
      <div>
        {camAbsent ? 
          <p>We need a camera</p> 
        : 
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
                onClick={this.nextStepClick}
                id='goNextBtn' 
                className="btn btn-outline-success btn-lg">
                {step === 1 && 'Train'}
                {step === 2 && 'Predict'}
              </button>}
              
            {step === 1 && 
              <div>
                <span>Step 1: Take photos of 3 Objects</span> <br/>
                <div className="d-flex justify-content-around mt-1">
                  {['danger', 'warning', 'info'].map((color, i) =>
                    <button
                      key={color}
                      className={`btn btn-outline-${color}`}
                      onTouchStart={() => this.handleCaptureStart(i)}
                      onTouchEnd={this.handleCaptureEnd}>
                      Object {i+1}
                      {labelCount[i] > 0 && <span class={`badge badge-pill badge-${color} ml-1`}>{labelCount[i]}</span>}
                    </button>
                  )}
                </div>
              {capturing &&<span id='shotCount'>{shotCount}</span>}
            </div> }

            {(step === 0 || step === 2) &&
              <div>
                {statusText}
              </div>
            }

            {step === 3 &&
              <div>
                <span>This could be...</span>
                <div className="d-flex justify-content-around mt-1">
                  {['danger', 'warning', 'info'].map((color, i) =>
                    <span className={`text-${color} mr-3`} style={{ fontWeight: `${900 * predictions[i]}`, }}>
                      Object {i+1} <br/>
                      ({parseFloat(predictions[i] * 100).toFixed(1)} %)
                    </span>
                  )}
                </div>
              </div>              
            }
          </div>
        </div>
        }
      </div>
      
    )
  }
}

