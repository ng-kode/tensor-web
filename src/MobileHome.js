import React, { Component } from 'react'
import { Link } from 'react-router-dom';
import './MobileHome.css'

export class MobileHome extends Component {
  render() {
    return (
      <div className="mobile-home-wrapper">
        <h1>Object recognizer</h1>
        <p>Pick one to start</p>
        <Link to='/recognise' className="btn btn-outline-primary m-2">A Pre-trained model for everyday objects</Link>
        <Link to='/make-your-own' className="btn btn-outline-primary m-2">Make your own recognizer</Link>
      </div>
    )
  }
}