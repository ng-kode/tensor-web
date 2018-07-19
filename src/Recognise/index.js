import React, { Component } from 'react';
import { IMAGENET_CLASSES } from '../IMAGENET_classes_zh';
import './Recognise.css'
import { Webcam } from '../Webcam';
import ImageUpload from './ImageUpload';
import imgToTensor from '../utils/imgToTensor';
const tf = window.tf

// other avaiable application-ready models: https://keras.io/applications/
const MOBILENET_PATH = 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json'


class Recognise extends Component {
  constructor(props) {
    super(props);
    this.state = {
      status_text: '',

      camAbsent: false,
      mobilenetReady: false,

      image_src: null,
      predictions: [],
    }

    this.IMAGE_SIZE = 224;
  }

  loadMobilenet() {
    console.log('loading mobilenet...')
    this.setState({ status_text: 'Loading neural network...' })

    tf.loadModel(MOBILENET_PATH).then(model => {
      this.mobilenet = model;
      this.mobilenet.predict(tf.zeros([1, this.IMAGE_SIZE, this.IMAGE_SIZE, 3])).print();
     
      console.log('mobilenet ready')
      this.setState({
        mobilenetReady: true,
        status_text: 'Neural network ready ! Try it !',
      })
    })    
  }

  handleFileInput = (e) => {
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
        img.width = this.IMAGE_SIZE;
        img.height = this.IMAGE_SIZE;
        img.onload = () => {
          const imgTensor = imgToTensor(img, tf);
          this.predict(imgTensor)
        }
      };
      reader.readAsDataURL(f);
    }
  }

  setPredictInterval = () => {
    this.interval = setInterval(() => {
      const imgTensor = this.webcam.capture();
      this.predict(imgTensor);
    }, 800)
  }
  

  predict = async (imgTensor) => {
    if (!this.state.mobilenetReady) {
      return console.log('mobilenet not ready');
    }

    if (!imgTensor) {
      return console.warn('no imgTensor for prediction');
    }
    
    this.mobilenet.predict(imgTensor).data().then(values => {
      let classProb = []
      for (let i = 0; i < values.length; i++) {
        const prob = values[i];
        const classIdx = i
        classProb.push({ classIdx, prob })
      }
  
      // sort by prob
      classProb.sort((a, b) => b.prob - a.prob)

      // get top 3
      let predictions = classProb.slice(0, 3)
  
      // get class name by classIdx
      predictions = predictions.map(obj => ({
        ...obj,
        name: IMAGENET_CLASSES[obj.classIdx]
      }))
  
      this.setState({ predictions })
    })
  }

  handleCamAbsent() {
    this.setState({ camAbsent: true })
  }

  componentDidMount() {
    this.loadMobilenet();
  }

  componentWillUnmount() {
    clearInterval(this.interval);
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
        {camAbsent
          ? (
            <ImageUpload
              status_text={status_text}
              mobilenetReady={mobilenetReady}
              onFileInput={this.handleFileInput}
              image_src={image_src}
              predictions={predictions}
            />
          )
          : (
            <Webcam          
              ref={webcam => this.webcam = webcam}
              fullscreen
              showCanvas
              showPredTable
              IMAGE_SIZE={this.IMAGE_SIZE} 
              onGetMediaSuccess={this.setPredictInterval}
              onCamAbsent={this.handleCamAbsent}
              predictions={predictions} 
            />
          )
        }
      </div>
    );
  }
}

export default Recognise;