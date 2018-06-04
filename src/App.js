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
      cams: null,
      streamTracks: null,
      camReady: false,

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
    // this.train()
  }

  preprocess() {
    let features = []
    let labels = []

    const {
      photos,
      names
    } = this.state;

    // making features
    for (const name in photos) {
      if (photos.hasOwnProperty(name)) {
        const urls = photos[name];
        for (let i = 0; i < urls.length; i++) {
          const url = urls[i];
          this.img.src = url
          this.img.width = IMAGE_SIZE
          this.img.height = IMAGE_SIZE

          let tensor = tf.fromPixels(this.img).toFloat()
          const offset = tf.scalar(255/2)
          tensor = tensor.sub(offset).div(offset)

          features.push(tensor)
        }
      }
    }
    features = tf.stack(features)
    console.log(features.shape)

    // making labels
    for (let i = 0; i < names.length; i++) {
      const name = names[i]
      if (photos[name].length > 0) {
        labels.push(i)
      }
    }
    labels = tf.oneHot(tf.tensor1d(labels).asType('int32'), labels.length-1 > 0 ? labels.length-1 : 1 )

    return Promise.resolve({ features, labels })
  }

  train() {
    console.log('train')

    this.preprocess().then(({ features, labels }) => {
      console.log(features)
      console.log(labels)
    })
  }

  render() {
    const {
      probs,
      names,
      photos
    } = this.state;

    return (
      <div>
        <div className="jumbotron">
          <h1 className="display-4">Image</h1>
          <p className="lead">text here</p>
          <button type="button" className="btn btn-primary">Dummy</button> 
          <span className='ml-2'>'status text here'</span>
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
