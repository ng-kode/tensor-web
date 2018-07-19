import React from 'react';

const Step1 = ({
  names,
  onTouchStart,
  labelCount,
  isCapturing,
  shotCount,
  sampleSizePerClass,
}) => (
  <div style={{height: '100%'}}>
    <h5
      style={{height: '8%'}}
    >
      Step 1: <b>Tap</b> to take photos of 3 different objects
    </h5>

    
    <div 
      className="valign-wrapper" 
      style={{justifyContent: 'space-around', height: '80%'}}
    >
      {names.map((color, i) =>
        <button
          key={color}
          className={
            `btn-floating btn-large waves-effect waves-light ${color}`
            + ` ${(isCapturing || labelCount[i] === sampleSizePerClass) ? 'disabled' : ''}`
          }
          onTouchStart={() => onTouchStart(i)}
        >
          <i className="material-icons right">add_a_photo</i>
        </button>
      )}
    </div>
    
    

    {isCapturing && (
      <span id='shotCount'>
        {shotCount === sampleSizePerClass - 1 ? 'ok!' : shotCount}
      </span>
    )}
  </div>
)

export default Step1;