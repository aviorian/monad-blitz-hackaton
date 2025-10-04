const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying with account:", deployer.address);

  // 1. LeaderboardRegistry kontratı
  const Registry = await ethers.getContractFactory("LeaderboardRegistry");
  const registry = await Registry.deploy(deployer.address);
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("🏗️  LeaderboardRegistry deployed to:", registryAddr);

  // 2. MonadCommunityTipRail kontratı
  const TipRail = await ethers.getContractFactory("MonadCommunityTipRail");
  const tipRail = await TipRail.deploy(
    deployer.address,  // owner
    deployer.address   // treasury (istersen farklı adres verebilirsin)
  );
  await tipRail.waitForDeployment();
  const tipRailAddr = await tipRail.getAddress();
  console.log("💸 MonadCommunityTipRail deployed to:", tipRailAddr);

  // 3. JSON dosyasına kaydet
  fs.writeFileSync(
    "deployed-address.json",
    JSON.stringify(
      {
        network: hre.network.name,
        deployer: deployer.address,
        LeaderboardRegistry: registryAddr,
        MonadCommunityTipRail: tipRailAddr,
      },
      null,
      2
    )
  );
  console.log("📁 Adresler kaydedildi -> deployed-address.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
