const RecoveryContract = artifacts.require("Recovery");
const ShardManagerContract = artifacts.require("ShardManager");
const NFTContract = artifacts.require("ShardNFT");

const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { inTransaction } = require('@openzeppelin/test-helpers/src/expectEvent');
const _deploy_contracts = require('../migrations/2_deploy_contracts');
const chai = require("./setupChai");
const should = chai.should();
const { expect } = chai;

contract("Recovery Contract", accounts => {
  const goverance = accounts[0];
  const notGovernance = accounts[1];
  const accountAlice = accounts[2];
  const accountBob = accounts[3];

  let deployedRecovery, amount, logs

  // Get a fresh instance of the contract before each test
  beforeEach(async function() {
    deployedRecovery = await RecoveryContract.deployed();
  });


  describe("Recovery Contract creation", async () => {
    
    it("Should allow the addition of trustees", async function(){
      
      const result = await deployedRecovery.addShardholder(notGovernance, {from: goverance});  
      const isShardHolder = await deployedRecovery.viewShardholder(notGovernance, {from: goverance});
    
      expect(isShardHolder).to.be.equal(true);
    });  

    it("Should create a valid NFT contract", async () => {
        const NFTAddress = await deployedRecovery.getNFTAddress({from: goverance});
        console.log(NFTAddress);
        expect(NFTAddress).to.not.be.equal(null);
    });

     //TODO: Transfer ownership to a new contract address - whenever the keys are cycled  
  });

  describe("Addition and Access to Trustees", async () => {
    
    it("Should allow the addition of trustees", async function(){
      
      const result = await deployedRecovery.addShardholder(notGovernance, {from: goverance});  
      const isShardHolder = await deployedRecovery.viewShardholder(notGovernance, {from: goverance});
    
      expect(isShardHolder).to.be.equal(true);
    });  

    it("Should not allow non-owner accounts to add trustee", async function(){
        await expectRevert(deployedRecovery.addShardholder(accountAlice, {from:notGovernance}), "Ownable: caller is not the owner");
    });

    it("Should not allow non-owner to view trustees", async function(){
        await expectRevert(deployedRecovery.viewShardholder(notGovernance, {from: accountAlice}), "Ownable: caller is not the owner");
    });
  });

  describe("Addition and Access to blacklist", async () => {
    it("Blacklists a trustee correctly", async function(){
        const result = await deployedRecovery.blackListShardholder(notGovernance, {from: goverance});
        const isBlackListed = await deployedRecovery.viewBlacklisted(notGovernance, {from: goverance});
    });

    it("Should not allow non-owner accounts to view or add blacklist", async function(){
        await expectRevert(deployedRecovery.blackListShardholder(accountAlice, {from:notGovernance}), "Ownable: caller is not the owner");
        await expectRevert(deployedRecovery.viewBlacklisted(accountAlice, {from:notGovernance}), "Ownable: caller is not the owner");
    });
  });



  describe("Triggering the Recovery Event", async () => {

     beforeEach(async function() {
            deployedRecovery = await RecoveryContract.new(
                ShardManagerContract.address, goverance, new BN(3)
            );
        }
     )

      it("Does not allow non trustees / not contract owner to trigger a recovery event", async function(){
          await expectRevert(deployedRecovery.triggerRecoveryEvent("Test", {from: accountBob}), "Not a valid Trustee");
      });

      it("Initialises the address initialising recovery to be 0x0", async function(){
        const triggeredRecovery = await deployedRecovery.viewWhoTriggeredRecovery({from: accountBob});
        expect(triggeredRecovery).to.be.equal("0x0000000000000000000000000000000000000000");
      })

      it("Sends a recovery NFT to the trustees addresses", async function(){
        // add alice as a shardholder
        const result = await deployedRecovery.addShardholder(accountAlice, {from: goverance});
        const isShardHolder = await deployedRecovery.viewShardholder(accountAlice, {from: goverance});
        expect(isShardHolder).to.be.equal(true);

        // Make alice send out a recovery event with a particular payload
        await deployedRecovery.triggerRecoveryEvent("Test", {from: accountAlice});
        
        // Check that the recovery NFT has been issued to alice the trustees account
        const NFTContractAddress = await deployedRecovery.getNFTAddress();
        const NFTInstance = await NFTContract.at(NFTContractAddress);

        const aliceBalance = await NFTInstance.balanceOf(accountAlice, {from: goverance});
        expect(aliceBalance).to.be.a.bignumber.equal(new BN(1)); 
        
        const aliceToken = await NFTInstance.tokenURI(1);
        expect(aliceToken).to.be.equal("Test");
      });

      it("Sets the address initiating recovery to be that who initialised recovery", async function(){
        // add alice as a shardholder
        const result = await deployedRecovery.addShardholder(accountAlice, {from: goverance});
        const isShardHolder = await deployedRecovery.viewShardholder(accountAlice, {from: goverance});
        expect(isShardHolder).to.be.equal(true);

        // Make alice send out a recovery event with a particular payload
        await deployedRecovery.triggerRecoveryEvent("Test", {from: accountAlice});

        // Check that the contract is in recovery mode and has been issued
        const triggeredRecovery = await deployedRecovery.viewWhoTriggeredRecovery({from: accountBob});
        expect(triggeredRecovery).to.be.equal(accountAlice);
      });

  });

  describe("Responding to Recovery Event", async function(){

  });




  //TODO: Transfer ownership to a new contract address - whenever the keys are cycled
});
