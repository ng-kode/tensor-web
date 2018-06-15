import React, { Component } from 'react'
import { MobileApp } from './MobileApp'
import { DesktopApp } from './DesktopApp'

import './App.css';
class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isMobile: false
    }
  }

	componentDidUpdate() {
	    console.log(process.env.NODE_ENV)
	}

  componentDidMount() {
	console.log(process.env.NODE_ENV)
    this.setState({ 
      isMobile: window.navigator.userAgent.toLowerCase().search(/mobile/) !== -1
    })
  }
  
  render(){
    const {
      isMobile
    } = this.state

    return(<div>

      {isMobile ? <MobileApp/> : <DesktopApp/>}

    </div>)
  }
}

export default App;
