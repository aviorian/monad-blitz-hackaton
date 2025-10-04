require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();   // .env dosyasını okumak için

const { RPC_URL, PRIVATE_KEY } = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",   // sende 0.8.28 kullanıyorsun, böyle kalsın
  networks: {
    monad: {
      url: RPC_URL,          // .env içindeki RPC_URL
      accounts: [PRIVATE_KEY], // .env içindeki PRIVATE_KEY
      chainId: 10143
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    }
  }
};
