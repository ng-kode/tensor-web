import React, { Component } from 'react';
import { Link } from 'react-router-dom'
import PredictionTable from './PredictionTable';
import './Webcam.css'
import imgToTensor from './utils/imgToTensor';
const tf = window.tf

export class Webcam extends Component {
  constructor(props) {
    super(props);
    this.state = {
      facingMode: 'environment',
    }

    this.IMAGE_SIZE = this.props.IMAGE_SIZE;
  }

  setUp = () => {
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
      return this.props.onCamAbsent();
    }

    const {
      facingMode
    } = this.state;
    const options = { video: { facingMode } }

    navigator.getUserMedia(
      options, 
      this.handleGetMediaSuccess, 
      err => {
        console.warn(err); 
        this.props.onCamAbsent();
      }
    );           
  }

  handleGetMediaSuccess = stream => {
    let startAt = Date.now()
    const interval = setInterval(() => {
      console.log('finding this.video');

      if (this.video) {
        console.log('this.video found')
        clearInterval(interval)
        // stream video
        this.video.srcObject = stream; 
        window.stream = stream;

        this.props.onGetMediaSuccess && this.props.onGetMediaSuccess();
      }
      
      if (Date.now() - startAt > 5000) {
        console.warn('cannot find this.video in 5s');
        clearInterval(interval)
      }
    }, 1000)    
  }

  stop = () => {
    if (window.stream) {
      window.stream.getTracks().forEach(function(track) {
        track.stop();
      });
    }
    console.log('all tracks stopped')
  }

  capture = () => {
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

      const imgTensor = imgToTensor(this.canvas);
      return imgTensor;
    })
  }

  changeCam = () => {
    console.log('changeCam!')
    this.stop()    

    const {
      facingMode
    } = this.state;
    const options = { 
      video: { 
        facingMode: facingMode === 'environment' 
          ? 'user'
          : 'environment' 
      } 
    }
    navigator.getUserMedia(
      options, 
      this.handleGetMediaSuccess,
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
      showPredTable,
      predictions,
      fullscreen,
      showCanvas
    } = this.props;
    

    return (
      <div className="d-flex justify-content-center">
        <video
          ref={webcam = this.webcam = webcam}
          id='webcam' 
          className={fullscreen ? 'fullscreen' : ''} 
          autoPlay 
          playsInline
        ></video>

        {showCanvas && (
            <canvas
              ref={canvas => this.canvas = canvas}
              id="previewCanvas"
              style={{ top: `${window.innerHeight/2 - this.IMAGE_SIZE/2}px` }}                
              width={this.IMAGE_SIZE} 
              height={this.IMAGE_SIZE}
            ></canvas>
        )}
        
        {fullscreen && (
          <span onClick={this.changeCam} id='changeCam'>
            <i className="fas fa-exchange-alt"></i>
          </span>
        )}

        {fullscreen && (
          <Link id='backBtn' to='/'>
            <i className="fas fa-long-arrow-alt-left"></i>
          </Link>
        )}
                
        {(showPredTable && predictions) && (
          <PredictionTable predictions={predictions} />
        )}
      </div>
    )
  }
}