import React, { Component } from 'react';
import * as tf from '@tensorflow/tfjs';
import PredictionTable from './PredictionTable';
import * as _ from 'lodash';
import './App.css'

const MOBILENET_NOTOP_PATH = 'mobilenet_noTop/model.json'
const IMAGE_SIZE = 224

function shuffle(arr1, arr2) {
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

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      status: '',

      cams: null,
      streamTracks: null,
      camReady: false,
      
      mobilenet: null,
      vanilla: null,
      training: false,
      modelHistory: null,

      names: ['A', 'B', 'C'],
      name2Idx: {
        'A': 0,
        'B': 1,
        'C': 2,
      },
      labels: [],
      features: [],
      probs: {
        'A': 0.33,
        'B': 0.33,
        'C': 0.33
      },
    }

    this.handleVideo = this.handleVideo.bind(this);
    this.handleMouseEnd = this.handleMouseEnd.bind(this);
    this.handleTrainClick = this.handleTrainClick.bind(this);
    this.debugPredict = this.debugPredict.bind(this);
    this.argMax2Int = this.argMax2Int.bind(this);
    this.fit_vanilla_dense = this.fit_vanilla_dense.bind(this);
  }

  _video = (video) => {
    this.video = video
  }

  _canvas = (canvas) => {
    this.canvas = canvas
  }

  _img = (img) => {
    this.img = img
  }

  handleVideo(stream) {
    // store active cam to state
    const streamTracks = stream.getVideoTracks()
    this.setState({ streamTracks })
    // stream video
    this.video.srcObject = stream;

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
      })
      .catch(err => console.warn(err))

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
    const options = { video: true }
    navigator.getUserMedia(options, this.handleVideo, this.handleVideoError);
  }

  capture() {
    return tf.tidy(() => {
      const img = tf.fromPixels(this.video)
      const batchedImg = img.expandDims()
      return batchedImg.toFloat().div(tf.scalar(255/2)).sub(tf.scalar(1))
    })
  }

  handleMouseStart(name) {
    const {
      name2Idx,
      names,
      features,
      labels
    } = this.state;

    console.log(name)
    this.capturing = setInterval(async () => {
      const feature = tf.tidy(() => this.state.mobilenet.predict(this.capture()))
      const idx = name2Idx[name]
      const label = tf.tidy(() => tf.oneHot(tf.tensor1d([idx]).toInt(), names.length))
      
      features.push(feature)
      labels.push(label)
      
      this.setState({
        features, labels
      })

      await tf.nextFrame()
    }, 150)
  }

  handleMouseEnd() {
    console.log('mouse up')
    clearInterval(this.capturing)
  }

  async fit_vanilla_dense(vanilla_in, vanilla_out) {
    const {
      names
    } = this.state
    
    // Sequential api got unsolved issue 
    // Uncaught (in promise) TypeError: _this.getClassName is not a function at Object.Layer (topology.js:108)
    // So use Model api
    const input = tf.input({shape: [7, 7, 1024]})
    const layer1 = tf.layers.flatten()
    const layer2 = tf.layers.dense({
      units: 256,
      activation: 'relu',
      // useBias: true,
      kernelInitializer: 'leCunNormal'
    })
    const layer3 = tf.layers.dropout({
      rate: 0.2
    })
    const layer4 = tf.layers.dense({
      units: names.length,
      activation: 'softmax'
    })
    const output = layer4.apply(layer3.apply(layer2.apply(layer1.apply(input))))
    const model = tf.model({
      inputs: input,
      outputs: output
    })

    const optimizer = tf.train.rmsprop(0.00002)
    model.compile({
      optimizer,
      loss: 'categoricalCrossentropy'
    });

    const batchSize = 2
    const numBatchPerEpoch = Math.ceil(vanilla_in.shape[0] / batchSize)

    let epochCount = 1;
    const epochs = 5;

    const modelHistory = await model.fit(
      vanilla_in, vanilla_out, 
      { 
        batchSize, 
        epochs,
        validationSplit: 0.2,
        callbacks: {
          onBatchEnd: async batchNum => {
            const progress = batchNum / numBatchPerEpoch
            console.log(`Epoch ${epochCount} / ${epochs}: ${parseFloat(progress * 100).toFixed(2)} %`)
          },
          onEpochBegin: async (epoch, logs) => {
            console.log(`Start epoch ${epochCount}`)
            await tf.nextFrame()
          },
          onEpochEnd: async (epoch, logs) => {
            console.log(`End of epoch ${epochCount}, loss: ${logs.loss.toFixed(5)}, val_loss: ${logs.val_loss.toFixed(5)}`)

            epochCount += 1
            await tf.nextFrame()
          },
          onTrainEnd: async () => {
            console.log('Training Complete !')
          }
        }
      }
    );

    this.setState({ modelHistory });
    window.modelHistory = modelHistory;

    return model
  }

  handleTrainClick() {
    this.setState({ training: true })

    const {
      features,
      labels
    } = this.state;

    const shuffledArrs = shuffle(features, labels)

    let concatedFeat = tf.concat(shuffledArrs[0])
    let concatedLab = tf.concat(shuffledArrs[1])

    this.fit_vanilla_dense(concatedFeat, concatedLab).then(vanilla => {
      this.setState({ vanilla, training: false })
    })    
  }

  argMax2Int(label) {
    return tf.argMax(label.as1D()).dataSync()[0]
  }

  debugPredict() {    
    const feature = tf.tidy(() => this.state.mobilenet.predict(this.capture()))        

    this.state.vanilla.predict(feature).data().then(results => {
      console.log(results)        
      let probs = this.state.probs;
      const names = this.state.names;
      for (let i = 0; i < results.length; i++) {
        const name = names[i];
        probs[name] = results[i];
      }
      this.setState({ probs })
      feature.dispose()
    })    
  }

  componentDidMount() {
    tf.loadModel(MOBILENET_NOTOP_PATH).then(mobilenet => {
      this.setState({ mobilenet })
      tf.tidy(() => {
        const img = this.capture()
        this.state.mobilenet.predict(img).print()        
      })
    })

    this.setUpWebCam()

    window.tf = tf
  }

  render() {
    const {
      status,
      probs,
      names,
      labels,
      name2Idx,
      vanilla,
      training
    } = this.state;

    return (
      <div>
        <div className="row bg-secondary mb-3" style={{height: '50vh'}}>          
            <div className="col-6 p-4">
              <h1 className="display-4">Image</h1>
              <p className="lead">text here</p>
              <button 
                onClick={this.handleTrainClick}
                type="button" 
                className="btn btn-primary"
                disabled={training ? true : false}
              >
                Train
              </button>
              <button className="btn" onClick={this.debugPredict} disabled={vanilla ? false : true}>Predict</button>
              <span className='ml-2'>{status}</span>
            </div>
            
            <div className="embed-responsive embed-responsive-1by1 col-6">
              <video className="embed-responsive-item p-4" autoPlay="true" ref={this._video} width={IMAGE_SIZE} height={IMAGE_SIZE}></video>
              <canvas style={{ display: 'none' }} ref={this._canvas}></canvas>
              <img style={{ display: 'none' }} ref={this._img} alt="dummy" width={IMAGE_SIZE} height={IMAGE_SIZE}/>
            </div>                            
        </div>

        <div className="container-fluid">
            {names.map(name => {
              return <div key={name} className="row mb-3">
                  <div className="col-4">
                    <button 
                      onMouseDown={() => this.handleMouseStart(name)}
                      onTouchStart={() => this.handleMouseStart(name)}
                      onMouseUp={this.handleMouseEnd}
                      onTouchEnd={this.handleMouseEnd}
                      className="btn btn-block btn-secondary" 
                      style={{ height: '90%' }}
                    >
                      Class {name} <span className="badge badge-light ml-1">
                      {labels.filter(label => {                          
                          return this.argMax2Int(label) == name2Idx[name]
                        }).length}
                      </span>
                    </button>
                  </div>
                  <div className="progress col-7 pl-0 mt-2">
                    <div className="progress-bar" role="progressbar" style={{ width: `${probs[name] * 100}%` }} aria-valuenow={probs[name]*100} aria-valuemin="0" aria-valuemax="100"></div>
                  </div>
              </div>
            })}
        </div>
      </div>
    )
  }
}

export default App;
