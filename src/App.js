import React, { Component } from 'react'
import { MobileApp } from './MobileApp'
import { DesktopApp } from './DesktopApp'

import './App.css';
class App extends Component {

	componentDidUpdate() {
	    console.log(process.env.NODE_ENV)
	}

  componentDidMount() {
    console.log(process.env.NODE_ENV)
    this.isMobile = window.navigator.userAgent.toLowerCase().search(/mobile/) !== -1
  }
  
  render(){
    return(<div>

      {this.isMobile ? <MobileApp/> : <DesktopApp/>}

    </div>)
  }
}

export default App;
