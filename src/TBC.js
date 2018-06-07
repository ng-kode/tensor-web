import React, { Component } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as _ from 'lodash'
// import CLASS_NAME HERE
import './TBC.css'

// other avaiable application-ready models: https://keras.io/applications/
const MOBILENET_PATH = 'mobilenet_noTop/model.json'
const FACE_MODEL_PATH = 'face_model/model.json';
const IMAGE_SIZE = 224

export class Face extends Component {
  constructor(props) {
    super(props);
    this.state = {
      status_text: '',

      camReady: false,
      camAbsent: false,
      cams: null,
      deviceIdx: null,

      mobilenetReady: false,
      facemodelReady: false,

      image_src: null,

      predictions: [],
    }

    this.handleVideo = this.handleVideo.bind(this)
    this.changeCam = this.changeCam.bind(this)
    this.watchStream = this.watchStream.bind(this)
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

  loadFaceModel() {
    console.log('loading face model...')

    tf.loadModel(FACE_MODEL_PATH).then(model => {
      this.facemodel = model;
      console.log('face model ready')
      this.setState({
        facemodelReady: true
      })
    })
  }

  handleVideo(stream) {
    // stream video
    this.video.srcObject = stream;
    window.stream = stream;

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
          this.setState({ camAbsent: true })
          return
        }
        // store list of cams to state
        this.setState({ cams })
        console.log(cams)

         // get cam stream
        navigator.getUserMedia = navigator.getUserMedia || 
        navigator.webkitGetUserMedia || 
        navigator.mozGetUserMedia || 
        navigator.msGetUserMedia || 
        navigator.oGetUserMedia;

        if(!navigator.getUserMedia) {
            console.log('getUserMedia absent')
            this.setState({ camAbsent: true })
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
      })
      .catch(err => console.warn(err))
  }

  changeCam() {
    console.log('changeCam!')

    if (window.stream) {
      window.stream.getTracks().forEach(function(track) {
        track.stop();
      });
    }

    let {
      cams,
      deviceIdx
    } = this.state;

    deviceIdx += 1;
    if (deviceIdx === cams.length) {
      console.log('back to 0')
      deviceIdx = 0
    }

    console.log(deviceIdx)
    this.setState({ deviceIdx })
    const deviceId = cams[deviceIdx].deviceId

    const options = { video: { deviceId } }
    navigator.getUserMedia(options, this.handleVideo, this.handleVideoError)
  }

  watchStream() {
    this.streaming = setInterval(() => {
      this.predict();
    }, 800)
  }

  capture() {
    if (!this.video) {
      console.warn('video not available to drawCanvas')
      clearInterval(this.streaming)
      if (window.stream) {
        window.stream.getTracks().forEach(function(track) {
          track.stop();
        });
      }
      return
    }

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

  async predict() {
    if (!this.state.mobilenetReady) {
      console.log('mobilenet not ready')
      return
    }
    if (!this.state.facemodelReady) {
      console.log('face model not ready')
      return
    }

    const img = this.capture();
    if (!img) {
      console.warn('no image to predict')
      return
    }
    this.mobilenet.predict(img).data().then(features => {
      console.log(features)
      this.facemodel.predict(tf.tensor(features, [1, features.length])).data().then(values => {
        console.log(values)
      })
    })

  }

  componentDidMount() {
    this.setUpWebCam()
    this.loadMobilenet()
    this.loadFaceModel()

    window.tf = tf
  }

  render() {
    const {
      camAbsent
    } = this.state

    return (
      <div>
        {camAbsent ? <div>
          Oops...we need a camera to do face sentiment analysis
        </div> : <div>
        <video id='webcam' autoPlay="true" ref={this._video} ></video>
        <canvas style={{ display: 'none' }} ref={this._canvas} width={IMAGE_SIZE} height={IMAGE_SIZE}></canvas>
        <span onClick={this.changeCam} id='changeCam'><i className="fas fa-exchange-alt"></i></span>
        <div id='videoContent'>
          hi
        </div>
        </div>}
      </div>
    )
  }
}

