import React, { Component } from 'react';
import * as tf from '@tensorflow/tfjs';
import PredictionTable from './PredictionTable';
import './App.css'

const MOBILENET_NOTOP_PATH = 'mobilenet_noTop/model.json'
const IMAGE_SIZE = 224

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
      activation: 'relu'
    })
    const layer3  = tf.layers.dropout({
      rate: 0.5
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

    const h = await model.fit(
      vanilla_in, vanilla_out, 
      { 
        batchSize: 2, 
        epochs: 2,
        callbacks: {
          onEpochBegin: async (epoch, logs) => {
            console.log(`Start epoch ${epoch}`)
            await tf.nextFrame()
          },
          onEpochEnd: async (epoch, logs) => {
            console.log(`End of epoch ${epoch}, loss: ${logs.loss.toFixed(5)}`)
            await tf.nextFrame()
          }
        }
      }
    );

    window.h = h;

    return model
  }

  handleTrainClick() {
    const {
      names,
      features,
      labels
    } = this.state;

    let concatedFeat = tf.concat(features)    
    let concatedLab = tf.concat(labels)

    this.fit_vanilla_dense(concatedFeat, concatedLab).then(vanilla => {
      this.setState({ vanilla })
    })    
  }

  argMax2Int(label) {
    return tf.argMax(label.as1D()).dataSync()[0]
  }

  debugPredict() {    
    const feature = tf.tidy(() => this.state.mobilenet.predict(this.capture()))        

    this.state.vanilla.predict(feature).data().then(results => {
      console.log(results)        
      
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
      training,
      probs,
      names,
      labels,
      name2Idx
    } = this.state;

    return (
      <div>
        <div className="jumbotron">
          <h1 className="display-4">Image</h1>
          <p className="lead">text here</p>
          <button 
            onClick={this.handleTrainClick}
            type="button" 
            className="btn btn-primary" 
            disabled={training}
          >
            Train
          </button>
          <button className="btn" onClick={this.debugPredict}>debugPredict</button>
          <span className='ml-2'>{status}</span>
        </div>

        <div className="container-fluid">
          <div className="row">
            <div className="col-4">
              <video autoPlay="true" ref={this._video} width={IMAGE_SIZE} height={IMAGE_SIZE}></video>
              <canvas style={{ display: 'none' }} ref={this._canvas}></canvas>
              <img style={{ display: 'none' }} ref={this._img} alt="dummy" width={IMAGE_SIZE} height={IMAGE_SIZE}/>
            </div>

            <div className="col-8">
                
                  {names.map(name => {
                    return <div key={name} className="row mb-3">
                        <div className="col-4">
                          <button 
                            onMouseDown={() => this.handleMouseStart(name)}
                            onMouseUp={this.handleMouseEnd}
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
                          <div className="progress-bar" role="progressbar" style={{ width: `${probs[name] * 100}%` }} aria-valuenow={`${probs[name]*100}`} aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                    </div>
                  })}
                
                
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default App;
