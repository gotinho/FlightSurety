
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async () => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error, result);
            display('Operational Status', 'Check if contract is operational', [{ label: 'Operational Status', error: error, value: result }]);
        });


        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [{ label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp }]);
            });
        });


        contract.airlines.forEach((address, i) => {
            DOM.elid('airlines').append(DOM.makeElement('option', { value: address }, 'Airline ' + i));
            DOM.elid('airlines2').append(DOM.makeElement('option', { value: address }, 'Airline ' + i));
        });

        // Deposit 
        DOM.elid('btn-airline-deposit').onclick = async () => {
            const value = DOM.elid('deposit-value').value;
            const asAirline = DOM.elid('airlines').value;

            await contract.deposit(asAirline, value);
        };

        // Register airline
        DOM.elid('btn-register-airline').onclick = async () => {
            const asAirline = DOM.elid('airlines').value;
            const forAirline = DOM.elid('airlines2').value;
            await contract.registerAirline(asAirline, forAirline);
        }

    });


})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({ className: 'row' }));
        row.appendChild(DOM.div({ className: 'col-sm-4 field' }, result.label));
        row.appendChild(DOM.div({ className: 'col-sm-8 field-value' }, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}





