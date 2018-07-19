import React from 'react';
import PredictionTable from '../PredictionTable';

const ImageUpload = ({
  status_text,
  mobilenetReady,
  onFileInput,
  image_src,
  predictions,
}) => (
  <div>
    <div className="jumbotron custom-jumbotron">
      <h1 className="display-4">What's in the image ?</h1>
      <p className="lead">
        Learn to name everyday objects <br/> 
        <small>(better experience with mobile / webcam)</small> 
      </p>
    </div>

    <div className="container">
      <span>{status_text}</span>

      <div 
        className="row" 
        style={{ visibility: mobilenetReady ? 'visible': 'hidden' }}
      >
        <div className="input-group mb-3 col-12">
          <div className="custom-file">
            <input 
              onChange={onFileInput} 
              type="file" 
              className="custom-file-input" 
              id="inputGroupFile02" 
            />
            <label 
              className="custom-file-label" 
              htmlFor="inputGroupFile02"
            >
              Choose / drag an image file here
            </label>
          </div>

          <div className="input-group-append">
            <span className="input-group-text" id="">Upload</span>
          </div>              
        </div>

        {image_src && (
          <div className="text-center col-6">
            <img src={image_src} className="img-thumbnail" alt="Upload" />
          </div>
        )}

        {predictions.length > 0 && (
          <PredictionTable predictions={predictions} />
        )} 
      </div>
    </div>
  </div>
)

export default ImageUpload;