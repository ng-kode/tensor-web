import React, { Component } from 'react'
import { Switch, Route } from 'react-router-dom'
// import { Router, Route } from "react-router";
import { Recognise } from './Recognise'
import { MakeYourOwn } from './MakeYourOwn';
import { MobileHome } from './MobileHome'

export class MobileApp extends Component {	
	render() {
		return (<div>
			<Switch>
        <Route exact path='/' component={MobileHome}/>
        <Route path='/recognise' component={Recognise}/>
        <Route path='/make-your-own' component={MakeYourOwn}/>
      </Switch>
		</div>)
	}
}