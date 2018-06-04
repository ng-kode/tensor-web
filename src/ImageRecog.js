import React, { Component } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as _ from 'lodash'
import { div } from '@tensorflow/tfjs';
import { IMAGENET_CLASSES } from './IMAGENET_classes_zh';
import { HAND_CLASSES } from './HAND_classes';
import PredictionTable from './PredictionTable';

const XCEPTION_PATH = 'xception/model.json'
const VGG16_PATH = 'vgg16/model.json'
// const MOBILENET_PATH = 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json'
const MOBILENET_PATH = 'mobilenet/model.json' // Mobile Net gives the smoothest performace
const MOBILENET_NOTOP_PATH = 'mobilenet_noTop/model.json'
const DENSENET121_PATH = 'densenet121/model.json'
const HAND_MODEL_PATH = 'hand/model.json'

const MODEL_PATH = HAND_MODEL_PATH 
const CLASSNAMES = HAND_CLASSES

// const IMAGE_SIZE = 299
const IMAGE_SIZE = 224


class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      image_src: null,
      status_text: '',
      predictions: [],
      cams: null,
      streamTracks: null,
      modelReady: false,
      camReady: false,
      url: null
    }

    this.handleFileInput = this.handleFileInput.bind(this);
    this.handleLoadModelClick = this.handleLoadModelClick.bind(this);
    this.handleVideo = this.handleVideo.bind(this);
    this.watchStream = this.watchStream.bind(this);
  }

  _video = (video) => {
    this.video = video
  }

  _canvas = (canvas) => {
    this.canvas = canvas
  }

  _streamImg = (img) => {
    this.streamImg = img
  }

  handleLoadModelClick(e) {
    console.log('loading model...')
    this.setState({ status_text: 'loading model...' })

    tf.loadModel(MOBILENET_NOTOP_PATH).then(mobilenet => {
      tf.loadModel(MODEL_PATH).then(json => {
        console.log('ok!')
        this.setState({ status_text: 'ok!' })
  
        window.model = json
        window.mobilenet = mobilenet
  
        const tmp_img = window.mobilenet.predict(tf.zeros([1, IMAGE_SIZE, IMAGE_SIZE, 3])).data().then(values => {
          console.log(values)
          const tmp = window.model.predict(tf.tensor(values).expandDims())
          tmp.print() // okay, thumbsdown, thumbsup
          tmp.dispose()
        })

        this.setState({ modelReady: true })
      })
    })
    
  }

  predict(img) {
    if (!this.state.modelReady) {
      console.log('model not ready yet')
      return
    }

    console.log('Predicting...');
    const img_to_dense = tf.tidy(() => {
      // shape [299, 299, 3]
      let tensor = tf.fromPixels(img).toFloat();

      // Rescale the pixel values (between 0 and 255) to the [0, 1] interval
      const offset = tf.scalar(255/2)
      tensor = tensor.sub(offset).div(offset)

      // Reshape to [1, 299, 299, 3]
      tensor = tensor.reshape([1, IMAGE_SIZE, IMAGE_SIZE, 3])

      // now predict
      return window.mobilenet.predict(tensor)
    })

    const result = tf.tidy(() => {
      console.log('input to result')
      console.log(img_to_dense)

      let input = img_to_dense.reshape([1, 7 * 7 * 1024])
      console.log('reshaped to')
      console.log(input)

      return window.model.predict(input)
    })
    
    img_to_dense.data().then(() => {
      result.data().then(values => {
        // values is Float32Array(1000)
        // index = class name, value = prob
  
        console.log('values ready');
        let classProb = []
        for (let i = 0; i < values.length; i++) {
          const prob = values[i];
          const classIdx = i
          classProb.push({ classIdx, prob })
        }
  
        // sort by prob, get top 3
        classProb = _.sortBy(classProb, ['prob']).reverse()
        let topThree = classProb.slice(0, 3)
  
        // get class name by classIdx
        topThree = topThree.map(obj => {
          obj.name = CLASSNAMES[obj.classIdx]
          return obj
        })

        this.setState({ predictions: topThree })
      })
    })
  }

  handleFileInput(e) {
    let files = e.target.files;

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.type.match('image.*')) {
        continue
      }
      let reader = new FileReader();
      reader.onload = e => {
        this.setState({ image_src: e.target.result })

        // create img element
        let img = document.createElement('img');
        img.src = e.target.result;
        img.width = IMAGE_SIZE;
        img.height = IMAGE_SIZE;
        img.onload = () => {
          this.predict(img)
        }
      };
      reader.readAsDataURL(f);
    }
  }

  watchStream() {
    const interval = setInterval(() => {
      this.canvas.width = IMAGE_SIZE;
      this.canvas.height = IMAGE_SIZE;

      // Create image
      const context = this.canvas.getContext('2d');
      context.drawImage(this.video, 0, 0, IMAGE_SIZE, IMAGE_SIZE);

      // Now predict
      const url = this.canvas.toDataURL('image/jpeg');
      this.streamImg.src = url
      this.setState({ url })
      this.predict(this.streamImg);
    }, 800)
    
    return interval
  }

  handleVideo(stream) {
    // store active cam to state
    const streamTracks = stream.getVideoTracks()
    this.setState({ streamTracks })
    // stream video
    this.video.srcObject = stream;

    this.setState({ camReady: true })
    this.watchStream()
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

    window.tf = tf
  }

  render() {
    const {
      image_src,
      status_text,
      predictions
    }  = this.state
    return (
      <div>
        <div className="jumbotron">
          <h1 className="display-4">Image classification</h1>
          <p className="lead">Learn to name everyday objects</p>
          <button onClick={this.handleLoadModelClick} type="button" className="btn btn-primary">Load model</button> 
          <span className='ml-2'>{status_text}</span>
        </div>

        <div className="container">
          <div className="row">
            <div className="input-group mb-3 col-12">
              <div className="custom-file">
                <input onChange={this.handleFileInput} type="file" className="custom-file-input" id="inputGroupFile02" />
                <label className="custom-file-label" htmlFor="inputGroupFile02">Choose file</label>
              </div>
              <div className="input-group-append">
                <span className="input-group-text" id="">Upload</span>
              </div>
            </div>

            {image_src && <div className="text-center col-6"><img src={image_src} className="img-thumbnail" alt="Responsive image" /></div>}
            {predictions.length > 0 && <PredictionTable predictions={predictions} />}

              <video autoPlay="true" ref={this._video} width={IMAGE_SIZE} height={IMAGE_SIZE}></video>              
              <canvas style={{ display: 'none' }} ref={this._canvas}></canvas>
              <img style={{ display: 'none' }} ref={this._streamImg} />
          </div>
        </div>
      </div>
    );
  }
}

export default App;
