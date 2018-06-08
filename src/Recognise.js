import React, { Component } from 'react';
import { Link } from 'react-router-dom'
import * as tf from '@tensorflow/tfjs';
import * as _ from 'lodash'
import { div } from '@tensorflow/tfjs';
import { IMAGENET_CLASSES } from './IMAGENET_classes_zh';
import PredictionTable from './PredictionTable';
import './Recognise.css'

// other avaiable application-ready models: https://keras.io/applications/
const MOBILENET_PATH = 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json'
const IMAGE_SIZE = 224


export class Recognise extends Component {
  constructor(props) {
    super(props);
    this.state = {
      status_text: '',

      camReady: false,
      camAbsent: false,
      cams: null,
      deviceIdx: null,

      mobilenetReady: false,

      image_src: null,

      predictions: [],
    }

    this.handleFileInput = this.handleFileInput.bind(this);
    this.handleVideo = this.handleVideo.bind(this);
    this.watchStream = this.watchStream.bind(this);
    this.changeCam = this.changeCam.bind(this);
    this.cutStream = this.cutStream.bind(this);
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
      this.mobilenet = model;
      this.mobilenet.predict(tf.zeros([1, 224, 224, 3])).print();
     
      console.log('mobilenet ready')
      this.setState({
        mobilenetReady: true,
        status_text: 'mobilenet ready !'
      })
    })    
  }

  capture(raw_img=null) {
    if (raw_img) {
      return tf.tidy(() => {
        const img = tf.fromPixels(raw_img); // [224, 224, 3]
        const batchedImg = img.expandDims(); // [1, 224, 224, 3]
        return batchedImg.toFloat().div(tf.scalar(255/2)).sub(tf.scalar(1))
      })
    } else {
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

  cutStream() {
    clearInterval(this.streaming);

    if (window.stream) {
      window.stream.getTracks().forEach(function(track) {
        track.stop();
      });
    }
  }

  watchStream() {
    this.streaming = setInterval(() => {
      if (!this.video) {
        return this.cutStream();
      }
      this.predict();
    }, 800)
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

  async predict(raw_img=null) {
    if (!this.state.mobilenetReady) {
      console.log('mobilenet not ready')
      return
    }

    const img = this.capture(raw_img);
    if (!img) {
      console.warn('no image to predict')
      return
    }
    this.mobilenet.predict(img).data().then(values => {
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
        obj.name = IMAGENET_CLASSES[obj.classIdx]
        return obj
      })
  
      this.setState({ predictions: topThree })
    })
  }

  componentDidMount() {
    this.setUpWebCam()
    this.loadMobilenet();

    window.tf = tf
  }

  render() {
    const {
      image_src,
      status_text,
      predictions,
      camAbsent
    }  = this.state
    return (
      <div>
        {camAbsent ? <div>

          <div className="jumbotron custom-jumbotron">
            <h1 className="display-4">Image classification </h1>
            <p className="lead">Learn to name everyday objects <small>(best experience on mobile / with webcam)</small> </p>
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
            </div>
          </div>

        </div> : <div>        
        <video id='webcam' autoPlay="true" ref={this._video} ></video>
        <canvas style={{ display: 'none' }} ref={this._canvas} width={IMAGE_SIZE} height={IMAGE_SIZE}></canvas>
        <span onClick={this.changeCam} id='changeCam'><i className="fas fa-exchange-alt"></i></span>
        <Link id='backBtn' to='/'><i className="fas fa-long-arrow-alt-left"></i></Link>
        <div id='videoContent'>
          <PredictionTable predictions={predictions} /> 
        </div>
      </div>}

      </div>
    );
  }
}

