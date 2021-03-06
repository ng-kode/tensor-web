import React, { Component } from 'react';
import { Webcam } from "../Webcam.js";
import { Storage } from './Storage';
import './MakeYourOwn.css'
import Step1 from './Step1.js';
import NextStepBtn from './NextStepBtn.js';
import buildModel from '../utils/buildModel.js';
import Step3 from './Step3.js';
import styles from '../utils/styles.js';
const tf = window.tf;
const names = ['pink', 'indigo', 'orange'];

// other avaiable application-ready models: https://keras.io/applications/
const MOBILENET_PATH = 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json';

class MakeYourOwn extends Component {
  constructor(props) {
    super(props);
    this.state = {
      camAbsent: false,
      mobilenetReady: false,
      statusText: '',
      
      step: 0,

      labelCount: {},
      shotCount: 0,

      isCapturing: false,
      canNextStep: false,

      progress: 0,
      lossText: '',

      predictions: [],
      predArgMax: null,
    }

    this.IMAGE_SIZE = 224;
    this.numClasses = 3;
    this.storage = new Storage(this.numClasses)
    this.sampleSizePerClass = 22;
  }
  
  loadMobilenet = () => {
    console.log('loading mobilenet...')
    this.setState({ statusText: 'loading mobilenet...' })
  
    tf.loadModel(MOBILENET_PATH).then(model => {
      const cutLayer = model.getLayer('conv_pw_13_relu');
      this.mobilenet = tf.model({
        inputs: model.inputs,
        outputs: cutLayer.output
      })
      this.mobilenet
        .predict(tf.zeros([1, 224, 224, 3]))
        .data()
        .then(values => {
          console.log(values)
          console.log('mobilenet ready')
          this.setState({
            mobilenetReady: true,
            step: this.state.step + 1,
            statusText: ''
          })
        })           
    })
  }

  handleCaptureStart = (label) => {
    if (this.state.isCapturing) {
      return
    }

    if (this.storage.labelCount().hasOwnProperty(label)) {
      if (this.storage.labelCount()[label] === this.sampleSizePerClass) {
        return console.log('photo limit reached')   
      }
    }

    this.setState({ isCapturing: true });

    this.interval = setInterval(() => {
      // store feature-label pair
      const featureTensor = this.mobilenet.predict(this.webcam.capture());
      const labelTensor = tf.oneHot(tf.tensor1d([label]).as1D().toInt(), this.numClasses);
      this.storage.store(featureTensor, labelTensor);

      // update labelCount
      const labelCount = this.storage.labelCount();   
      console.log(labelCount);

      this.setState({
        labelCount,
        shotCount: labelCount[label],
      });

      // clearInterval if reaching sample size
      if (labelCount[label] === this.sampleSizePerClass) {
        clearInterval(this.interval);
        this.setState({ 
          isCapturing: false,
        });        
      }

      // update next step if necessary
      const isEnoughSamples = Object.keys(labelCount)
        .filter(label => labelCount[label] !== this.sampleSizePerClass)
        .length === 0
      
      if (
        Object.keys(labelCount).length === this.numClasses
          && isEnoughSamples
      ) {
        this.setState({ canNextStep: true })
      }
    }, 100);
  }

  handleTrainClick = async () => {
    this.setState({ 
      canNextStep: false, 
      step: this.state.step + 1,
    });

    this.webcam.stop();

    this.storage.shuffleSamples();
    const validationSplit = 0.2
    const { train, test } = this.storage.train_test_split(validationSplit)
  
    const batchSize = 2;
    const numBatches = parseInt(train.x.length / batchSize)
  
    this.vanilla = buildModel(this.numClasses, tf);
    const epochs = 5;

    console.log('start training');
    this.setState({ 
      statusText: 'Preparing to train' 
    })
    
    let currEp = 1;
    await this.vanilla.fit(tf.concat(train.x), tf.concat(train.y), {
      batchSize,
      epochs,
      callbacks: {
        onEpochBegin: async (epoch, _) => {
          console.log('onEpochBegin', epoch)
          await tf.nextFrame();
        },
        onBatchEnd: async (batch, logs) => {
          console.log(logs)
          const progress = parseInt(batch/numBatches * 100);
          this.setState({ 
            statusText: `Epoch: ${currEp} / ${epochs} (${progress} %)`,
            lossText: `Loss: ${logs.loss.toFixed(5)}`,
            progress,
          })
          await tf.nextFrame();
        },
        onEpochEnd: async (epoch, logs) => {
          console.log('onEpochEnd', epoch)
          console.log(logs)
          currEp += 1
          await tf.nextFrame();
        }
      }
    })

    this.setState({ 
      statusText: 'Training completed. Now evaluating...' 
    })

    const result = this.vanilla.evaluate(tf.concat(test.x), tf.concat(test.y))
    result.print()

    this.setState({ 
      statusText: `Training completed,`,
      lossText: `Final loss: ${result.dataSync()}`,
      canNextStep: true,
    })

    this.webcam.setUp();
  }

  handlePredictClick = () => {
    this.setState({
      canNextStep: false,
      step: this.state.step + 1,
      isCapturing: true,
    });

    this.interval = setInterval(async () => {     
      const feature = this.mobilenet.predict(this.webcam.capture());

      this.vanilla.predict(feature).data().then(predictions => {
        console.log(predictions);

        let prob = 0;
        let predArgMax;

        predictions.forEach((pred, i) => {
          if (pred > prob) {
            prob = pred;
            predArgMax = i;
          }
        });

        this.setState({ predictions, predArgMax });
      })
      
      await tf.nextFrame();
    })
  }

  handleCamAbsent = () => {
    this.setState({ camAbsent: true });
  }
  

  componentDidMount() {
    this.loadMobilenet();
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  render() {
    const {
      camAbsent,
      labelCount,
      predictions,
      predArgMax,
      step,
      shotCount,
      isCapturing,
      canNextStep,
      progress,
      statusText,
      lossText,
    } = this.state

    return (
      <div>
        {camAbsent ? 
          <p>We need a camera</p> 
        : 
        <div>         
          <Webcam          
            ref={webcam => this.webcam = webcam}
            fullscreen
            IMAGE_SIZE={this.IMAGE_SIZE}
            showCanvas={isCapturing}
            onCamAbsent={this.handleCamAbsent}            
          />

          <div style={styles.videoBottomContent}>
            <NextStepBtn
              step={step}
              canNextStep={canNextStep}
              isCapturing={isCapturing}
          
              onStepTwo={this.handleTrainClick}
              onStepThree={this.handlePredictClick}
            />

            {step === 0 && (
              <div>
                <h5>
                  Loading mobilenet...
                </h5>
                <div className="progress">
                    <div className="indeterminate"></div>
                </div>
              </div>
              
            )}

            {step === 1 && (
              <Step1
                names={names}
                onTouchStart={this.handleCaptureStart}
                labelCount={labelCount}
                isCapturing={isCapturing}
                shotCount={shotCount}
                sampleSizePerClass={this.sampleSizePerClass}
              />
            )}

            {step === 2 && (
              <div>
                <h5>
                  Step 2: Training
                </h5>
                <span className="flow-text" style={{ fontSize: '20px' }}>
                  {statusText} <br/>
                  {lossText}
                </span>
                <div className="progress">
                  <div className="determinate" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}

            {step === 3 && (
              <Step3
                names={names}
                predictions={predictions}
                predArgMax={predArgMax}
              />              
            )}
          </div>
        </div>
        }
      </div>
      
    )
  }
}

export default MakeYourOwn;