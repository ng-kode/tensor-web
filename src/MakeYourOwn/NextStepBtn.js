import React, { Component } from 'react';

class NextStepBtn extends Component {
  handleTouchStart = () => {
    const {
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
      step,
      canNextStep,
      isCapturing,
  
      onStep2Title,
      onStep3Title,
    } = this.props;

    return (
      <div>
        {(canNextStep && !isCapturing) && (
          <button
            onTouchStart={this.handleTouchStart}
            id='goNextBtn' 
            className="btn btn-outline-success btn-lg">
            {step === 1 && onStep2Title}
            {step === 2 && onStep3Title}
          </button>
        )}
      </div>
    )
  }  
}

export default NextStepBtn;