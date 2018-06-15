import React, { Component } from 'react';
import * as _ from 'lodash'
import { IMAGENET_CLASSES } from './IMAGENET_classes_zh';
import PredictionTable from './PredictionTable';
import './Recognise.css'
import { Webcam } from './Webcam';
const tf = window.tf

// other avaiable application-ready models: https://keras.io/applications/
const MOBILENET_PATH = 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json'
const IMAGE_SIZE = 224


export class Recognise extends Component {
  constructor(props) {
    super(props);
    this.state = {
      status_text: '',

      camAbsent: false,
      mobilenetReady: false,

      image_src: null,

      predictions: [],
    }

    this.handleFileInput = this.handleFileInput.bind(this);
    this.predict = this.predict.bind(this);
    this.setCamAbsent = this.setCamAbsent.bind(this);
  }

  _webcam = webcam => {
    this.webcam = webcam;
  }

  loadMobilenet() {
    console.log('loading mobilenet...')
    this.setState({ status_text: 'Loading neural network...' })

    tf.loadModel(MOBILENET_PATH).then(model => {
      this.mobilenet = model;
      this.mobilenet.predict(tf.zeros([1, IMAGE_SIZE, IMAGE_SIZE, 3])).print();
     
      console.log('mobilenet ready')
      this.setState({
        mobilenetReady: true,
        status_text: 'Neural network ready ! Try it !'
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

  async predict(raw_img=null) {
    if (!this.state.mobilenetReady) {
      console.log('mobilenet not ready')
      return
    }
    
    const img = this.webcam.capture(raw_img);
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

  setCamAbsent() {
    this.setState({ camAbsent: true })
  }

  componentDidMount() {
    this.loadMobilenet();

    window.tf = tf
  }

  render() {
    const {
      image_src,
      status_text,
      predictions,
      camAbsent,
      mobilenetReady
    }  = this.state
    return (
      <div>
        { camAbsent ? <div>
          <div className="jumbotron custom-jumbotron">
            <h1 className="display-4">What's that in the image ?</h1>
            <p className="lead">Learn to name everyday objects <br/> <small>(better experience with mobile / webcam)</small> </p>
          </div>

          <div className="container">
            <span>{status_text}</span>
            <div className="row" style={{ visibility: mobilenetReady ? 'visible': 'hidden' }}>
              <div className="input-group mb-3 col-12">
                <div className="custom-file">
                  <input onChange={this.handleFileInput} type="file" className="custom-file-input" id="inputGroupFile02" />
                  <label className="custom-file-label" htmlFor="inputGroupFile02">Choose / drag an image file here</label>
                </div>
                <div className="input-group-append">
                  <span className="input-group-text" id="">Upload</span>
                </div>              
              </div>

              {image_src && <div className="text-center col-6"><img src={image_src} className="img-thumbnail" alt="Upload" /></div>}
              {predictions.length > 0 && <PredictionTable predictions={predictions} />}         
            </div>
          </div>
        </div> :        
        <Webcam          
          ref={this._webcam} 
          fullscreen
          IMAGE_SIZE={IMAGE_SIZE} 
          watcherCb={this.predict}
          isStopWatcher={window.location.pathname !== '/recognise'}
          setCamAbsent={this.setCamAbsent}
          predictions={predictions} />
        }
      </div>
    );
  }
}

