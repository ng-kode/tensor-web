import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import { Switch, Route } from 'react-router-dom'
import { Home } from './Home'
import { Recognise } from './Recognise'
import { Tweets } from './Tweets'
import { MakeYourOwn } from './MakeYouOwn';
import './App.css';
class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isMobile: false
    }
  }

  componentDidMount() {
    const $ = window.$;
    $('#navbarSupportedContent .nav-item').click(function () {
      $('.navbar-collapse').collapse('hide')
    })

    this.setState({ 
      isMobile: window.navigator.userAgent.toLowerCase().search(/mobile/) !== -1
    })
  }
  
  render(){
    const {
      isMobile
    } = this.state

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
            <Link className="nav-item nav-link" to='/tweets'>Tweets</Link>
            <Link className="nav-link nav-link" to='/make-your-own'>Make Your Own</Link>          
          </div>
        </div>
      </nav>

      <Switch>
        <Route exact path='/' component={Home}/>
        <Route path='/recognise' component={Recognise}/>
        <Route path='/tweets' component={() => <Tweets isMobile={isMobile} />}/>
        <Route path='/make-your-own' component={MakeYourOwn}/>
      </Switch>
      
    </div>)
  }
}

export default App;