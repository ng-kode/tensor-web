import React from 'react';
import styles from './utils/styles';

const PredictionTable = ({
  predictions,
}) => (
  <div style={styles.videoBottomContent}>
    <table>
      <tbody>
        {predictions.map((pred, i) =>
          <tr key={pred.name}>
            <td>{pred.name}</td>
            <td>{parseFloat(pred.prob * 100).toFixed(2)} %</td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
)

export default PredictionTable;