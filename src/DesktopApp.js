import React, { Component } from 'react'
import { Switch, Route, Link } from 'react-router-dom'
import { Home } from './Home'
import { Recognise } from './Recognise'
import { MakeYourOwn } from './MakeYouOwn';
import './App.css';

export class DesktopApp extends Component {
  constructor(props) {
    super(props);
  }
  
  render(){
    return(<div>

      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <Link className="navbar-brand" to='/'>Tensor web</Link>
        <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>
        
        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          <div className="navbar-nav mr-auto">
            <Link className="nav-item nav-link" to='/'>Home</Link>
            <Link className="nav-item nav-link" to='/recognise'>Image</Link>
            <Link className="nav-link nav-link" to='/make-your-own'>Train a model live !</Link>          
          </div>
        </div>
      </nav>

      <Switch>
        <Route exact path='/' component={Home}/>
        <Route path='/recognise' component={Recognise}/>
        <Route path='/make-your-own' component={MakeYourOwn}/>
      </Switch>
      
    </div>)
  }
}
