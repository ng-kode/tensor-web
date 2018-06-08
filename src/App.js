import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import { Switch, Route } from 'react-router-dom'
import { Home } from './Home'
import { Recognise } from './Recognise'
import { MakeYourOwn } from './MakeYouOwn';
import { DesktopApp } from './DesktopApp';
import { MobileApp } from './MobileApp'
import './App.css';
class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isMobile: false
    }
  }

  componentDidMount() {
    console.log(window.navigator.userAgent);
    
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