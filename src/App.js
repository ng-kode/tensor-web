import React, { Component } from 'react'
import { Switch, Route } from 'react-router-dom'
import { Home } from './Home'
import { Recognise } from './Recognise'
import { Tweets } from './Tweets'
import { MakeYourOwn } from './MakeYouOwn';

const App = () => (
  <Switch>
    <Route exact path='/' component={Home}/>
    <Route path='/recognise' component={Recognise}/>
    <Route path='/tweets' component={Tweets}/>
    <Route path='/make-your-own' component={MakeYourOwn}/>
  </Switch>
)

export default App;