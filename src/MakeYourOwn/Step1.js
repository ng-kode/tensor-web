import React from 'react';

const Step1 = ({
  names,
  onTouchStart,
  onTouchEnd,
  labelCount,
  capturing,
  shotCount,
  sampleSizePerClass,
}) => (
  <div>
    <span>Step 1: <b>Tap</b> each button to take photos of 3 different objects</span>

    <div className="d-flex justify-content-around mt-1">
      {names.map((color, i) =>
        <button
          key={color}
          className={`btn btn-outline-${color}`}
          onTouchStart={() => onTouchStart(i)}
          onTouchEnd={onTouchEnd}
        >
          Capture
          {labelCount[i] > 0 && (
            <span className={`badge badge-pill badge-${color} ml-1`}>
              {labelCount[i]}
            </span>
          )}
        </button>
      )}
    </div>

    {capturing && (
      <span id='shotCount'>
        {shotCount === sampleSizePerClass ? 'ok!' : shotCount}
      </span>
    )}
  </div>
)

export default Step1;