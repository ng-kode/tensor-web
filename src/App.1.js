import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import * as tf from '@tensorflow/tfjs';
import { encode, decode } from 'punycode';

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      body_text: '',
      ready: false
    }

    this.handleBodyText = this.handleBodyText.bind(this)
  }

  async loadPretrainedModel(encoder_path, decoder_path) {
    try {
        const encoder = await tf.loadModel(encoder_path)
        const decoder = await tf.loadModel(decoder_path)

        return { encoder, decoder }
    } catch (err) {
        console.log('Load pretrained model failed:')
        console.error(err)
        return;  
    }
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
    let raw_tokenized = [];
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
      console.log(word)
      if (this.word2idx_body.hasOwnProperty(word)) {
        const idx = this.word2idx_body[word]
        raw_tokenized.push(idx)
      }
    }
    
    // Now pad it by BODY_LENGTH
    const BODY_LENGTH = 70
    raw_tokenized = raw_tokenized.splice(0, BODY_LENGTH)
    console.log(raw_tokenized)
  }

  bootUp() {
    const p1 = this.loadPretrainedModel('encoder/model.json', 'decoder/model.json').then(({ encoder, decoder }) => {
      return { encoder, decoder }
    })

    const p2 = fetch( 'tk_body.word2idx.json' ).then(response => response.json()).then(data => {
      return { word2idx_body: data }
    })

    const p3 = fetch( 'tk_title.word2idx.json' ).then(response => response.json()).then(data => {
      return { word2idx_title: data }
    })

    return Promise.all([p1, p2, p3])
  }

  componentDidMount(){    
    this.bootUp().then(values => {
      console.log(values)
      const { encoder, decoder } = values[0]
      const { word2idx_body } = values[1]
      const { word2idx_title } = values[2]

      this.encoder = encoder;
      this.decoder = decoder;
      this.word2idx_body = word2idx_body;
      this.word2idx_title = word2idx_title;

      this.setState({ ready: true });
    })
  }

  render() {
    const {
      body_text
    } = this.state;

    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to React</h1>
        </header>
        <p className="App-intro">
          To get started, edit <code>src/App.js</code> and save to reload.
        </p>

        <textarea value={body_text} onChange={this.handleBodyText} cols="30" rows="10"></textarea>
      </div>
    );
  }
}

export default App;
