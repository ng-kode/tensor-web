import React from 'react'

const Step3 = ({
  names,
  predictions,
  predArgMax,
}) => (
  <div>
    <span>Step 3: Recognise !</span> <br/>
    <span>
      Our model now keeps recognising the object in front of the camera, with <b>probabilities</b> shown.
    </span>
    
    <div className="d-flex justify-content-around mt-1">
      {names.map((color, i) =>
        <span 
          key={color} 
          className={`text-${color} mr-3 p-2 rounded ` 
            + `${i === predArgMax ? 'border border-' + color : 'null'}`} 
        >
          Object {i+1} <br/>
          ({parseFloat(predictions[i] * 100).toFixed(1)} %)
        </span>
      )}
    </div>
  </div>
)

export default Step3;