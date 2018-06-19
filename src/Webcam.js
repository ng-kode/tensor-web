import React, { Component } from 'react';
import { Link } from 'react-router-dom'
import PredictionTable from './PredictionTable';
import './Webcam.css'
const tf = window.tf

this.IMAGE_SIZE = 224

export class Webcam extends Component {
  constructor(props) {
    super(props);
    this.state = {
      deviceIdx: null
    }

    this.IMAGE_SIZE = this.props.IMAGE_SIZE;

    this.setUp = this.setUp.bind(this)
    this.handleVideo = this.handleVideo.bind(this)
    this.stop = this.stop.bind(this)
    this.capture = this.capture.bind(this)
    this.changeCam = this.changeCam.bind(this)
    this.watchOnDemand = this.watchOnDemand.bind(this)
  }

  _video = (video) => {
    this.video = video
  }

  _canvas = (canvas) => {
    this.canvas = canvas
  }

  setUp() {
      navigator.mediaDevices.enumerateDevices()
      .then(dvs => {
        const cams = dvs.filter(d => d.kind === 'videoinput')
        if(cams.length === 0) {
          console.log('videoinput absent')
          this.props.setCamAbsent()
          return
        }
        this.cams = cams
  
        navigator.getUserMedia = navigator.getUserMedia || 
        navigator.webkitGetUserMedia || 
        navigator.mozGetUserMedia || 
        navigator.msGetUserMedia || 
        navigator.oGetUserMedia;
  
        if(!navigator.getUserMedia) {
          console.log('getUserMedia absent')
          this.props.setCamAbsent()
          return
        }
  
        let backCams = cams
                          .filter(cam => 
                            cam.label.toLowerCase().search(/back/) !== -1 || 
                            cam.label.toLowerCase().search(/rear/) !== -1)
                          .map(cam => cam.deviceId)
        let deviceIdx;
        let options
        if (backCams.length === 0) {
          console.log('no backCams')
          deviceIdx = 0
          options = { video: true }
        } else {
          const deviceId = backCams[0]
          deviceIdx = cams.map(cam => cam.deviceId).indexOf(deviceId)
          options = { video: { deviceId } }
        }
        this.setState({ deviceIdx })
        
        navigator.getUserMedia(options, this.handleVideo, err => {console.warn(err); this.props.setCamAbsent()});
      })
      .catch(err => {console.warn(err); this.props.setCamAbsent()})    
  }

  handleVideo(stream) {
    let startAt = Date.now()
    const interval = setInterval(() => {
      if (this.video) {
        clearInterval(interval)
        // stream video
        this.video.srcObject = stream;
        window.stream = stream;

        if (this.props.watcherCb) {
          this.watcher()
        }
      }
      console.log('finding this.video');
      if (Date.now() - startAt > 5000) {
        console.warn('cannot find this.video in 5s');
        clearInterval(interval)
      }
    }, 1000)    
  }

  watcher() {
    this.interval = setInterval(() => {
      this.props.watcherCb()
    }, 100)
  }

  watchOnDemand(cb, stopWhen) {
    this.interval = setInterval(() => {
      cb()
    }, 100)
  }

  stop() {
    if (window.stream) {
      window.stream.getTracks().forEach(function(track) {
        track.stop();
      });
    }
    clearInterval(this.interval)
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
        this.canvas.height = this.IMAGE_SIZE
        this.canvas.width = this.IMAGE_SIZE

        let sx, sy;
        sx = this.video.videoWidth/2 - this.IMAGE_SIZE/2
        sy = this.video.videoHeight/2 - this.IMAGE_SIZE/2
        
        ctx.drawImage(this.video, 
          sx, sy,
          this.IMAGE_SIZE, this.IMAGE_SIZE,
          0, 0, this.IMAGE_SIZE, this.IMAGE_SIZE)

        const img = tf.fromPixels(this.canvas); // [224, 224, 3]
        const batchedImg = img.expandDims(); // [1, 224, 224, 3]
        return batchedImg.toFloat().div(tf.scalar(255/2)).sub(tf.scalar(1))                
      })
    }    
  }

  changeCam() {
    console.log('changeCam!')
    this.stop()

    let {
      deviceIdx
    } = this.state;

    deviceIdx += 1;
    if (deviceIdx === this.cams.length) {
      console.log('back to 0')
      deviceIdx = 0
    }

    console.log(deviceIdx)
    this.setState({ deviceIdx })
    const deviceId = this.cams[deviceIdx].deviceId

    const options = { video: { deviceId } }
    navigator.getUserMedia(options, this.handleVideo, err => console.warn(err))
  }

  componentDidMount() {
    this.setUp()
  }

  componentWillUnmount() {
    this.stop()
  }

  render() {
    const {
      predictions,
      fullscreen,
      showCanvas
    } = this.props;
    

    return (
      <div className="d-flex justify-content-center">        
        <video id='webcam' className={fullscreen ? 'fullscreen' : ''} autoPlay="true" ref={this._video} ></video>        
        {showCanvas && 
          <canvas 
            style={{ border: '1px solid white', position: 'fixed', top: `${window.outerHeight/2 - this.IMAGE_SIZE/2}px` }} 
            ref={this._canvas} width={this.IMAGE_SIZE} height={this.IMAGE_SIZE}></canvas>}
        
        {fullscreen &&  <span onClick={this.changeCam} id='changeCam'><i className="fas fa-exchange-alt"></i></span>}
        {fullscreen && <Link id='backBtn' to='/'><i className="fas fa-long-arrow-alt-left"></i></Link>}
                
        {predictions && <div id='videoContent'>
          <PredictionTable predictions={predictions} /> 
        </div>}

        
      </div>
    )
  }
}