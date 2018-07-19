import React, { Component } from 'react';

class NextStepBtn extends Component {
  handleTouchStart = () => {
    const {
      step,
      onStepTwo,
      onStepThree,
    } = this.props;

    switch (step) {
      case 1:
        onStepTwo();
        break;

      case 2:
        onStepThree();
        break;
    
      default:
        console.warn('Next step action not provided');
        break;
    }
  }
  
  render() {
    const {
      canNextStep,
      isCapturing,
    } = this.props;

    return (
      <div>
        {(canNextStep && !isCapturing) && (
          <button
            onTouchStart={this.handleTouchStart}
            id='goNextBtn' 
            className="btn-floating btn-large waves-effect waves-light pulse">
            <i className="material-icons">done</i>
          </button>
        )}
      </div>
    )
  }  
}

export default NextStepBtn;