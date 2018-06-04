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
      ourModel:null,
      training: false,

      names: ['A', 'B', 'C'],
      photos: [],
      probs: {
        'A': 0.33,
        'B': 0.33,
        'C': 0.33
      },
    }

    this.handleVideo = this.handleVideo.bind(this);
    this.handleMouseEnd = this.handleMouseEnd.bind(this);
    this.preprocess = this.preprocess.bind(this);
    this.handleTrainClick = this.handleTrainClick.bind(this);
    this.debugPredict = this.debugPredict.bind(this);
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

  componentDidMount() {
    this.setUpWebCam()
  }

  handleMouseStart(name) {
    console.log(name)
    this.capturing = setInterval(() => {
      this.canvas.width = IMAGE_SIZE
      this.canvas.height = IMAGE_SIZE

      const context = this.canvas.getContext('2d')
      context.drawImage(this.video, 0, 0, IMAGE_SIZE, IMAGE_SIZE)
      const url = this.canvas.toDataURL('image/jpeg')

      // save the urls, later use them to create img and predict
      const photos = this.state.photos
      photos.push({ name, url })
      this.setState({ photos })
    }, 150)
  }

  handleMouseEnd() {
    console.log('mouse up')
    clearInterval(this.capturing)
  }

  handleTrainClick() {
    this.setState({ training: true, status: 'Start training...' })
    setTimeout(() => {
      this.train()
    }, 800)
  }

  preprocess() {
    let features = []
    let labels = []

    const {
      photos,
      names
    } = this.state;

    for (let i = 0; i < photos.length; i++) {
      const { name, url } = photos[i];
      const idx = names.indexOf(name)

      this.img.src = url
      this.img.width = IMAGE_SIZE
      this.img.height = IMAGE_SIZE

      let tensor = tf.fromPixels(this.img).toFloat()
      const offset = tf.scalar(255/2)
      tensor = tensor.sub(offset).div(offset)

      features.push(tensor)
      labels.push(idx)

      tensor.dispose()
    }

    features = tf.stack(features)

    labels = tf.oneHot(tf.tensor1d(labels).asType('int32'), names.length)

    return Promise.resolve({ features, labels })
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

    await model.fit(
      vanilla_in, vanilla_out, 
      { batchSize: 2, epochs: 5 }
    );

    return model
  }

  train() {
    const {
      mobilenet
    } = this.state

    if (!mobilenet) {
      console.log('mobilenet not available');
      return;
    }

    this.preprocess().then(({ features, labels }) => {
      console.log(features)
      console.log(labels)

      const mobilenet_out = tf.tidy(() => {
        return mobilenet.predict(features)
      })

      const model = this.fit_vanilla_dense(mobilenet_out, labels)
      model.then(values => {
        console.log(values)
        this.setState({ ourModel: values, training: false, status: 'Model ready!' })
      })
    })
  }

  debugPredict() {
    this.canvas.width = IMAGE_SIZE
    this.canvas.height = IMAGE_SIZE

    const context = this.canvas.getContext('2d')
    context.drawImage(this.video, 0, 0, IMAGE_SIZE, IMAGE_SIZE)
    const url = this.canvas.toDataURL('image/jpeg')
    this.img.src = url
    this.img.width = IMAGE_SIZE
    this.img.height = IMAGE_SIZE

    let tensor = tf.fromPixels(this.img).toFloat()
    const offset = tf.scalar(255/2)
    tensor = tensor.sub(offset).div(offset)

    tensor = tensor.reshape([1, IMAGE_SIZE, IMAGE_SIZE, 3])
    this.state.mobilenet.predict(tensor).data().then((values) => {
      const tensor2 = tf.tensor(values).reshape([1, 7, 7, 1024])

      this.state.ourModel.predict(tensor2).data().then(results => {
        console.log(results)        
        tensor.dispose()
        tensor2.dispose()
      })
    })
  }

  componentWillMount() {
    tf.loadModel(MOBILENET_NOTOP_PATH).then(mobilenet => {
      this.setState({ mobilenet })
    })
  }

  render() {
    const {
      status,
      training,
      probs,
      names,
      photos
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
                            Class {name} <span className="badge badge-light ml-1">{photos.filter(obj => obj.name === name).length}</span>
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
