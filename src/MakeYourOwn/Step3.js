import React from 'react'

const Step3 = ({
  names,
  predictions,
  predArgMax,
}) => (
  <div>
    <h5>Step 3: Classify !</h5>
    
    <div className="valign-wrapper" style={{justifyContent: 'space-around'}}>
      {names.map((color, i) =>
        <div key={color}>
          <button 
            key={color}
            className={
              `btn-floating btn-large waves-effect waves-light ${color}`
              + `${i === predArgMax ? '' : ' disabled'}`
            }
          >
            <i className="material-icons">thumb_up</i>
          </button>
          <span style={{
            marginLeft: '5px'
          }}>
            {parseFloat(predictions[i] * 100).toFixed(1)}%
          </span>
        </div>        
      )}
    </div>
  </div>
)

export default Step3;