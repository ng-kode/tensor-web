import React from 'react';

const PredictionTable = (props) => {
  const styles = {
    container: {
      position: 'fixed',
      bottom: '0',
      background: 'rgba(0, 0, 0, 0.5)',
      color: '#f1f1f1',
      width: '100%',
      minHeight: '25%',
    }
  }

  return (
    <div style={styles.container}>
      <table className="col-6 table table-hover">           
        <tbody>
          {props.predictions.map((pred, i) =>
            <tr key={pred.name} className={i === 0 ? 'table-active' : ''}>
              <td>{pred.name}</td>
              <td>{Number(Math.round(pred.prob+'e4')+'e-2')} %</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default PredictionTable;