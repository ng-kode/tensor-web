import React, { Component } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as _ from 'lodash'
import { div } from '@tensorflow/tfjs';
import { IMAGENET_CLASSES } from './IMAGENET_classes';

const XCEPTION_MODEL_PATH = 'xeception/model.json'
// const XCEPTION_MODEL_PATH = 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json';

const IMAGE_SIZE = 299
// const IMAGE_SIZE = 224


class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      image_src: null,
      status_text: '',
      predictions: []
    }

    this.handleFileInput = this.handleFileInput.bind(this);
    this.handleLoadModelClick = this.handleLoadModelClick.bind(this);
  }

  handleLoadModelClick(e) {
    console.log('loading model...')
    this.setState({ status_text: 'loading model...' })

    tf.loadModel(XCEPTION_MODEL_PATH).then(json => {
      console.log('ok!')
      this.setState({ status_text: 'ok!' })
      console.log(json)

      this.xception = json

      const tmp = this.xception.predict(tf.zeros([1, IMAGE_SIZE, IMAGE_SIZE, 3]))
      tmp.print()
      tmp.dispose()
    })
  }

  predict(img) {

    const logreg = tf.tidy(() => {
      // shape [299, 299, 3]
      let tensor = tf.fromPixels(img).toFloat();

      // Rescale the pixel values (between 0 and 255) to the [0, 1] interval
      const offset = tf.scalar(255/2)
      tensor = tensor.sub(offset).div(offset)

      // Reshape to [1, 299, 299, 3]
      tensor = tensor.reshape([1, IMAGE_SIZE, IMAGE_SIZE, 3])

      // now predict
      return this.xception.predict(tensor);
    })
    
    logreg.data().then(values => {
      // values is Float32Array(1000)
      // index = class name, value = prob
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

  renderPredictions() {
    const {
      predictions
    } = this.state;

    if (!predictions.length > 0) {
      console.log('No predictions found')
      return
    }

    const rows = predictions.map((pred, i) => 
      <tr className={i === 0 ? 'table-active' : ''}>
        <td>{pred.name}</td>
        <td>{Number(Math.round(pred.prob+'e4')+'e-2')} %</td>
      </tr>
    )

    return rows
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
            {predictions.length > 0 && 
              <table className="col-6 table table-hover">
                <thead>
                  <tr>
                    <th scope="col">This is ...</th>
                    <th scope="col">Of Chance...</th>
                  </tr>
                </thead>
                <tbody>
                  {this.renderPredictions()}
                </tbody>
              </table>}
          </div>
        </div>
      </div>
    );
  }
}

export default App;
