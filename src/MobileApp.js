import React, { Component } from 'react'
import { Switch, Route } from 'react-router-dom'
import { path } from "./constants";
import { Recognise } from './Recognise'
import { MakeYourOwn } from './MakeYourOwn';
import { MobileHome } from './MobileHome'

export class MobileApp extends Component {	
	render() {
		return (<div>
			<Switch>
        <Route exact path='/' component={MobileHome}/>
        <Route path={`${path.recognise}`} component={Recognise}/>
        <Route path={`${path.makeYourOwn}`} component={MakeYourOwn}/>
      </Switch>
		</div>)
	}
}