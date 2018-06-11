import React from 'react';

function PredictionTable(props) {
    return <table className="col-6 table table-hover">           
            <tbody>
                {props.predictions.map((pred, i) =>
                    <tr key={pred.name} className={i === 0 ? 'table-active' : ''}>
                        <td>{pred.name}</td>
                        <td>{Number(Math.round(pred.prob+'e4')+'e-2')} %</td>
                    </tr>
                )}
            </tbody>
        </table>
}

export default PredictionTable;