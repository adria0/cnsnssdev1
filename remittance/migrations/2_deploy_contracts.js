var Remittance = artifacts.require("./Remittance.sol");

module.exports = function(deployer) {

  deployer.deploy(
  	 Remittance,
     3688*48 // 2 days
  );

};
