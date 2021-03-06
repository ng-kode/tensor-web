import React, { Component } from 'react'
import { Switch, Route, Link } from 'react-router-dom'
import { path } from './constants'
import { Home } from './Home'
import Recognise from './Recognise'
import MakeYourOwn from './MakeYourOwn';
import './App.css';

export class DesktopApp extends Component {
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
            <Link className="nav-item nav-link" to='/recognise'>Recognise everday objects</Link>
            <Link className="nav-link nav-link" to='/make-your-own'>Train a model live !</Link>          
          </div>
        </div>
      </nav>

      <Switch>
        <Route exact path='/' component={Home}/>
        <Route path={`${path.recognise}`} component={Recognise}/>
        <Route path={`${path.makeYourOwn}`} component={MakeYourOwn}/>
      </Switch>
      
    </div>)
  }
}
