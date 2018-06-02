import React, { Component } from 'react';
import './App.css';
import * as tf from '@tensorflow/tfjs';
import * as _ from 'lodash'
import { getColorMatrixTextureShapeWidthHeight } from '@tensorflow/tfjs-core/dist/kernels/webgl/tex_util';

const twitterBackgroundColor = '#29A0EC'

class App extends Component {
  constructor(props) {
    super(props);

    this.BODY_LENGTH = 30
    this.DIM = 10000
    this.state = {
      body_text: '',
      ready: false,
      raw_tokenized: null,
      output_tensor: null,
      score: null
    }

    this.handleBodyText = this.handleBodyText.bind(this)
  }

  one_hot_encode_sequences(sequences, dimension=this.DIM) {
    let buffer = tf.buffer([sequences.length, dimension])
    sequences.map((seq, row) => {
      seq.map((idx, i) => {
        buffer.set(1, row, idx)
      })
    })

    buffer.toTensor().print()

    return buffer.toTensor()
  }

  handleBodyText(e) {    
    const body_text = e.target.value
    this.setState({ body_text })

    if (!this.state.ready) {
      console.log('not ready')
      return;
    }

    // Generate raw_tokenized
    let split = [];
    let userText_tokenzied = [];
    let lines = body_text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const words = line.split(' ')
      for (let j = 0; j < words.length; j++) {
        const word = words[j];
        split.push(word)
      }
    }
    for (let i = 0; i < split.length; i++) {
      const word = split[i];
      if (this.word2idx.hasOwnProperty(word)) {
        const idx = this.word2idx[word]
        userText_tokenzied.push(idx)
      }
    }
    
    // Pad it by BODY_LENGTH
    let raw_tokenized = Array(this.BODY_LENGTH).fill(0);
    if (userText_tokenzied.length > this.BODY_LENGTH) {
      raw_tokenized = userText_tokenzied.slice(0, this.BODY_LENGTH)
    } else {
      raw_tokenized = _.dropRight(raw_tokenized, userText_tokenzied.length).concat(userText_tokenzied)
    }

    this.setState({ raw_tokenized })

    // turn raw_tokenized into input_tensor
    const X_vecs = this.one_hot_encode_sequences([raw_tokenized])
    
    
    // Now predict
    const pred = this.model.predict(X_vecs);
    pred.print();
    
    //  download value from tensor
    const ans = pred.data()    
    ans.then(value => {
      if (this.state.body_text === '') {
        return this.setState({ score: 0.5000000000000000 })
      }
      this.setState({ score: value[0] })
    })

    // Dispose tensor from memory
    pred.dispose();    
  }

  bootUp() {
    const p1 = tf.loadModel('model/model.json').then(json => {
      console.log(json)
      return { model: json }
    })

    const p2 = fetch( 'word_index.json' ).then(response => response.json()).then(data => {
      return { word2idx: data }
    })    

    return Promise.all([p1, p2])
  }

  customLogger() {
    var logger = document.getElementById('log');
    console.log = function (message) {
      if (typeof msg == 'object') {
        logger.innerHTML += (JSON && JSON.stringify ? JSON.stringify(message) : String(message)) + '<br />';
      } else {
        logger.innerHTML += message + '<br />';
      }
      
      logger.scrollTop = logger.scrollHeight;
    }
  }

  componentDidMount(){    
    this.bootUp().then(values => {
      this.model = values[0].model;
      this.word2idx = values[1].word2idx;
      this.setState({ ready: true })
    })

    this.customLogger()

    window.tf = tf
  }

  render() {
    const {
      body_text,
      raw_tokenized,
      score
    } = this.state;

    return (
      <div className="App">
       <div className="jumbotron" style={{ backgroundColor: twitterBackgroundColor, color: 'white' }}>
          <h1 class="display-4">Sentiment Analysis on Tweets</h1>
          <p class="lead">Or any other IM messages...</p>
       </div>
        
        <div className="container">
          <div className="row">
            <div className="col-7 p-3">
              <span className="float-left pl-2">What's on your mind ?</span>
              <textarea className="form-control" value={body_text} onChange={this.handleBodyText} placeholder="So i'm gonna say ...."></textarea>
            </div>
            <div className="col-5 p-3">
              {raw_tokenized && 
              <div>
                <b>Message tokenized:</b>  
                <p>[{raw_tokenized.join(', ')}]</p>
              </div>}
            </div>

            {score && 
                <div className="col-7 p-3">
                  <b>Sentiment score:</b>
                  <div className="progress" style={{height: '50px'}}>
                    <div className="progress-bar" role="progressbar" style={{ width: `${score * 100}%`, fontSize: '24px', backgroundColor: twitterBackgroundColor }} aria-valuenow="50" aria-valuemin="0" aria-valuemax="100">
                      {Math.round(score * 100)} %
                    </div>
                  </div>
                </div>
              }

              <div className="col-5 p-3" style={score ? { visibility: 'visible' } : { visibility: 'hidden' } }>
                <b>Model logs</b>
                <div id="log"></div>
              </div>
            </div>
          </div>
        </div>
    );
  }
}

export default App;
