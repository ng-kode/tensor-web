import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import './Home.css'

export const Home = () => (
  <div className="jumbotron jumbotron-fluid custom-landing">
    <div className="container">
      <h1 className="display-4">Tensor web</h1>
      <p className="lead">Explore what deep learning can do on the web.</p>
      <Link className="btn btn-outline-primary btn-lg" to='/recognise'>Get started</Link>
    </div>
  </div>
)
