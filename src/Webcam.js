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
      deviceId: null,
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
    this.stop()

    if(
      (
        navigator.userAgent.toLowerCase().search(/iphone/) !== -1 ||
        navigator.userAgent.toLowerCase().search(/ipad/) !== -1 ||
        navigator.userAgent.toLowerCase().search(/ipod/) !== -1
      ) &&
      !navigator.getUserMedia
    ){
      alert("Advise using Safari in order to use camera.")
      return this.props.setCamAbsent();
    }

    const options = { video: { facingMode: 'environment' } }

    navigator.getUserMedia(
      options, 
      this.handleVideo, 
      err => {
        console.warn(err); 
        this.props.setCamAbsent();
      }
    );           
  }

  handleVideo(stream) {
    let startAt = Date.now()
    const interval = setInterval(() => {
      console.log('finding this.video');

      if (this.video) {
        console.log('this.video found')
        clearInterval(interval)
        // stream video
        this.video.srcObject = stream; 
        window.stream = stream;

        if (this.props.watcherCb) {
          this.watcher()
        }
      }
      
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
    console.log('all tracks stopped')
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

    const options = { video: { facingMode: 'user' } }
    navigator.getUserMedia(
      options, 
      this.handleVideo, 
      err => console.warn(err)
    )
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
        <video id='webcam' className={fullscreen ? 'fullscreen' : ''} autoPlay playsInline ref={this._video}></video>        
        {showCanvas && 
          <canvas 
            style={{ border: '1px solid white', position: 'fixed', top: `${window.innerHeight/2 - this.IMAGE_SIZE/2}px` }} 
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