pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    struct Airline {
        bool registered;
        uint256 depositedValue;
        mapping(address => bool) voted;
        uint256 votesCount;
    }
    
    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;        
        address airline;
        string code;
        mapping(address => uint256) passengerInsuranceValue;
        address[] passengers;
        uint256 passengersCount;
    }
    mapping(bytes32 => Flight) private flights;
    
    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    uint256 private _minFundCollateral;
    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    mapping(address => bool) private authorizedContracts;
    mapping(address => Airline) private airlines;
    uint256 private _airlinesCount;
    mapping(address => uint256) balances;                               // Keep passengers balances for withdraw 

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                    address firstAirline
                                ) 
                                public 
    {
        contractOwner = msg.sender;
        _minFundCollateral = 10 ether;
        airlines[firstAirline].registered = true;
        _airlinesCount = 1;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireAuthorizedCaller() {
        require(authorizedContracts[msg.sender], "Caller is not authorized");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }

    function authorizeCaller (address contractAddress) external requireContractOwner {
        authorizedContracts[contractAddress] = true;
    }
    
    function deauthorizeCaller (address contractAddress) external requireContractOwner {
        delete authorizedContracts[contractAddress];
    }

    function isAirline(address airline) external view returns(bool) {
        return airlines[airline].registered;
    }
   
    function getAirlineDepositedValue(address airline) external view returns(uint256) {
        return airlines[airline].depositedValue;
    }

    function minFundCollateral() external view returns(uint256) {
        return _minFundCollateral;
    }

    function setMinFundCollateral(uint256 value) external requireContractOwner {
        _minFundCollateral = value;
    }

    function hasVoted(address newAirline, address voter) external view returns(bool){
        return airlines[newAirline].voted[voter];
    }

    function getVotesCount(address newAirline) external view returns(uint256){
        return airlines[newAirline].votesCount;
    }

    function airlinesCount() external view returns(uint256) {
        return _airlinesCount;
    }

    function isFlightRegistered(bytes32 key) external view returns(bool){
        return flights[key].isRegistered;
    }
    
    function getFlightStatus(bytes32 key) external view returns(uint8){
        return flights[key].statusCode;
    }

    function getPassengersCount(bytes32 key) external view returns(uint256){
        return flights[key].passengersCount;
    }

    function getPassenger(bytes32 key, uint256 index) external view returns(address){
        return flights[key].passengers[index];
    }

    function getPassengerInsuranceValue(bytes32 key, address passenger) external view returns(uint256){
        return flights[key].passengerInsuranceValue[passenger];
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * Register a future flight
     */
    function registerFlight(address airline, string flight, uint256 timestamp) external requireIsOperational requireAuthorizedCaller {
        bytes32 key = getFlightKey(airline, flight, timestamp);
        Flight storage f = flights[key];
        f.isRegistered = true;
        f.updatedTimestamp = timestamp;
        f.code = flight;
        f.airline = airline;
    }

    /**
     * Increment the votes count for a new airline in the registration queue process
     */
    function incrementVote(address newAirline, address voter) external requireAuthorizedCaller requireIsOperational {
        airlines[newAirline].voted[voter] = true;
        airlines[newAirline].votesCount = airlines[newAirline].votesCount.add(1);
    }

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline
                            (   
                                address newAirline
                            )
                            external 
                            requireIsOperational
                            requireAuthorizedCaller
    {
        airlines[newAirline].registered = true;
        _airlinesCount = _airlinesCount.add(1);
    }


   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                (
                    bytes32 key,
                    address passenger,
                    uint256 value                      
                )
                external
                payable
                requireIsOperational
                requireAuthorizedCaller
    {
        Flight storage flight = flights[key];
        flight.passengers.push(passenger);
        flight.passengerInsuranceValue[passenger] = value;
        flight.passengersCount = flight.passengersCount.add(1);
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                )
                                external
                                pure
    {
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                            )
                            external
                            pure
    {
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                            (   
                            )
                            public
                            payable
                            requireIsOperational
                            requireAuthorizedCaller
    {
    }

    /**
     * Increment airline initial funding
     */
    function incrementDepositedValue(address airline, uint256 value) public requireIsOperational requireAuthorizedCaller {
        airlines[airline].depositedValue = airlines[airline].depositedValue.add(value);
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        fund();
    }


}

