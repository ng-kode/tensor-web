import React, { Component } from 'react';
import * as tf from '@tensorflow/tfjs';
import PredictionTable from './PredictionTable';

const MOBILENET_NOTOP_PATH = 'mobilenet_noTop/model.json'
const IMAGE_SIZE = 224


class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      cams: null,
      streamTracks: null,
      camReady: false,

      model: null,
      names: ['A', 'B', 'C'],
      photos: {},
      probs: {
        'A': 0.33,
        'B': 0.33,
        'C': 0.33
      }
    }
  }

  _video = (video) => {
    this.video = video
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

  render() {
    const {
      probs,
      names
    } = this.state;

    return (
      <div>
        <div className="jumbotron">
          <h1 className="display-4">Image</h1>
          <p className="lead">text here</p>
          <button type="button" className="btn btn-primary">Dummy</button> 
          <span className='ml-2'>'status text here'</span>
        </div>

        <div className="container">
          <div className="row">
            <div className="col-4">
              <video autoPlay="true" ref={this._video} width={IMAGE_SIZE} height={IMAGE_SIZE}></video>              
            </div>
            <div className="col-8">
              <table className="table table-borderless">
                <tbody>
                  <tr style={{ visibility: 'hidden' }}>
                    <td>1</td>
                    <td>1</td>
                    <td>1</td>
                    <td>1</td>
                    <td>1</td>
                  </tr>

                  {names.map(name => {
                    return <tr key={name}>
                      <td style={{ border: 'none' }}>{name}</td>
                      <td colSpan="4" style={{ border: 'none' }}>
                        <div className="progress">
                          <div className="progress-bar" role="progressbar" style={{ width: `${probs[name] * 100}%` }} aria-valuenow={`${probs[name]*100}`} aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                      </td>
                    </tr>
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default App;
