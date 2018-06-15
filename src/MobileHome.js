import React, { Component } from 'react'
import { Link } from 'react-router-dom';
import './MobileHome.css'
import { Recognise } from './Recognise';

export class MobileHome extends Component {
  render() {
    return (
      <div className="mobile-home-wrapper">
        <h1>Tensor web</h1>
        <p>Explore deep learning on the web</p>
        <Link to='/recognise' component={Recognise} className="btn btn-outline-primary m-2">Recognise everyday objects</Link>
        <button type="button" className="btn btn-outline-secondary m-2" disabled>Make your own model (Coming soon!)</button>
      </div>
    )
  }
}