import React, { Component } from 'react'
import { Switch, Route } from 'react-router-dom'
import { Home } from './Home'
import { Recognise } from './Recognise'
import { Sentiment } from './Sentiment'

const App = () => (
  <Switch>
    <Route exact path='/' component={Home}/>
    <Route path='/recognise' component={Recognise}/>
    <Route path='/sentiment' component={Sentiment}/>
  </Switch>
)

export default App;