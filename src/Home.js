import React, { Component } from 'react'
import { Link } from 'react-router-dom'

export const Home = () => (
  <div>
    <li><Link to='/'>Home</Link></li>
    <li><Link to='/recognise'>Recognise</Link></li>
    <li><Link to='/sentiment'>Sentiment</Link></li>
  </div>
)
