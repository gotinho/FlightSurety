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

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    uint256 private _minFundCollateral;
    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    mapping(address => bool) private authorizedContracts;
    mapping(address => Airline) private airlines;
    uint256 private _airlinesCount;

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

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/


    function incrementVote(address newAirline, address voter) external requireAuthorizedCaller {
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
                            )
                            external
                            payable
    {

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
                            requireAuthorizedCaller
    {
    }

    function incrementDepositedValue(address airline, uint256 value) public requireAuthorizedCaller {
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

