import React, { Component } from 'react'
import { Link } from 'react-router-dom';

export class MobileHome extends Component {
  render() {
    return (
      <div className="container valign-wrapper" style={{ height: '100vh' }}>
        <div className="center-align">
          <h1>Image classfier</h1>
          <h5>Pick one to start</h5>
          <Link to='/recognise' className="m-3 waves-effect waves-light btn">
            Recognise daily life objects
          </Link>
          <Link to='/make-your-own' className="m-3 waves-effect waves-light btn">
            Make your own classifier
          </Link>
        </div>
      </div>
    )
  }
}