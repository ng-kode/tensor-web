import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import * as tf from '@tensorflow/tfjs';
import * as _ from 'lodash'

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

  async loadPretrainedModel(model_path) {
    try {
        const model = await tf.loadModel(model_path)

        return { model }
    } catch (err) {
        console.log('Load pretrained model failed:')
        console.error(err)
        return;  
    }
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
    const p1 = this.loadPretrainedModel('model/model.json').then(({ model }) => {
      return { model }
    })

    const p2 = fetch( 'word_index.json' ).then(response => response.json()).then(data => {
      return { word2idx: data }
    })    

    return Promise.all([p1, p2])
  }

  componentDidMount(){    
    this.bootUp().then(values => {
      this.model = values[0].model;
      this.word2idx = values[1].word2idx;
      this.setState({ ready: true })
    })

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
        <header className="App-header">
          <h1 className="App-title">Sentiment Analysis for tweets</h1>
          <small>or any other IM messages...</small>
        </header>
        <p className="App-intro">
          To get started, type something below.
        </p>
        
        <div className="container">
          <textarea className="form-control mb-3" value={body_text} onChange={this.handleBodyText} cols="30" rows="5" placeholder="So i'm gonna say ...."></textarea>

          {raw_tokenized && 
          <div>
            <b>Message tokenized:</b>  
            <p>[{raw_tokenized.join(', ')}]</p>
          </div>}

          
            {score && 
              <div>
                <b>Sentiment score:</b>
                <div className="progress" style={{height: '50px'}}>
                  <div className="progress-bar bg-info" role="progressbar" style={{ width: `${score * 100}%`, fontSize: '16px' }} aria-valuenow="50" aria-valuemin="0" aria-valuemax="100">
                    {score}
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      
    );
  }
}

export default App;
