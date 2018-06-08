import React, { Component } from 'react'
import { Link } from 'react-router-dom';
import './MobileHome.css'
import { Recognise } from './Recognise';
import { MakeYourOwn } from './MakeYourOwn'

export class MobileHome extends Component {
  render() {
    return (
      <div className="mobile-home-wrapper">
        <h1>Tensor web</h1>
        <p>Explore deep learning on the web</p>
        <Link to='/recognise' component={Recognise} className="btn btn-outline-primary m-2">Recognise everyday objects</Link>
        <Link to='/make-your-own' component={MakeYourOwn} className="btn btn-outline-secondary m-2">Make your own model</Link>
      </div>
    )
  }
}